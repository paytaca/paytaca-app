
import { satoshiToBch } from 'src/exchange';
import { loadCardUser } from 'src/services/card/user';
import { backend as posBackend } from "src/wallet/pos"

export async function fetchCards (context, { page = 1, page_size = 10, filters = {} } = {}) {
    try {        
        const cardUser = await loadCardUser();
        const cards = await cardUser.fetchCards({ page, page_size, filters });
        if (!Array.isArray(cards)) {
            console.error('fetchCards returned non-array:', cards);
            throw new Error('fetchCards did not return an array');
        }
        context.commit('setCards', cards);
        return cards;
    } catch (error) {
        console.error('Error in fetchCards action:', error);
        throw error;
    }
}

export async function fetchCardTransactions (context, { cardId, page = 1, page_size = 10 } = {}) {
    try {
        let card = context.state.cards.find(c => c.id === cardId);
        if (!card) {
            card = await loadCardUser().then(async cardUser => cardUser.fetchCardByIdentifier(cardId));
        }
        let transactions = await card.getTransactions({ page, page_size });
        if (!Array.isArray(transactions)) {
            console.error('fetchCardTransactions returned non-array:', transactions);
            throw new Error('fetchCardTransactions did not return an array');
        }
        console.log('Fetched transactions:', transactions);
        const merchantRefIds = [...new Set(transactions.map(tx => tx.merchant?.ref_id).filter(id => id != null))];
        console.log('Merchant reference IDs to fetch:', merchantRefIds);

        // TODO: inefficient to fetch merchants one by one, but backend doesn't support batch fetching yet
        //  — optimize when endpoint is available
        const merchants = await Promise.all(merchantRefIds.map(id => (posBackend.get(`paytacapos/merchants/${id}/`).then(res => res.data))));

        console.log('Fetched merchants:', merchants);

        transactions = transactions.map(tx => ({
            id: tx.id,
            txid: tx.txid,
            merchant: {
                id: tx.merchant?.ref_id,
                name: merchants.find(merchant => merchant.id === tx.merchant?.ref_id)?.name || 'Unknown Merchant',
            },
            amount: satoshiToBch(tx.value),
            created_at: (new Date(tx.created_at)).toLocaleString(), // Format timestamp for display
        }));
        console.log('Formatted transactions:', transactions);
        context.commit('setCardTransactions', { cardId, transactions });
        return transactions;
    } catch (error) {
        console.error('Error in fetchCardTransactions action:', error);
        throw error;
    }
}