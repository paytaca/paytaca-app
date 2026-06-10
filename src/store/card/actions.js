
import { satoshiToBch } from 'src/exchange';
import { loadCardUser } from 'src/services/card/user';
import { backend as posBackend } from "src/wallet/pos";
import { Card } from 'src/services/card/card';
import { getMerchantList } from 'src/services/card/merchants';

function toPlainCard(card) {
    if (!card) return null;
    return card?.raw ? { ...card.raw } : { ...card };
}

async function hydrateCard(cardData) {
    if (!cardData) return null;
    if (cardData?.raw) return cardData;
    return cardData?.contract_id
        ? await Card.createInitialized(cardData)
        : await Card.createWithWallet(cardData);
}

export async function fetchCard(context, cardId) {
    try {
        const cardUser = await loadCardUser();
        let card = await cardUser.fetchCardByIdentifier(cardId);
        const plainCard = toPlainCard(card);

        let storedCard = context.state.cards.find(c => c.id === cardId);
        if (!storedCard) {
            context.commit('addCard', plainCard);
        } else {
            context.commit('updateCard', plainCard);
        }
        return plainCard;
    } catch (error) {
        console.error('Error in fetchCard action:', error);
        throw error;
    }
}

export async function fetchCards (context, { page = 1, page_size = 10, filters = {} } = {}) {
    try {        
        const cardUser = await loadCardUser();
        const cards = await cardUser.fetchCards({ page, page_size, filters });
        if (!Array.isArray(cards)) {
            console.error('fetchCards returned non-array:', cards);
            throw new Error('fetchCards did not return an array');
        }
        const plainCards = cards.map(toPlainCard);
        context.commit('setCards', plainCards);
        return plainCards;
    } catch (error) {
        console.error('Error in fetchCards action:', error);
        throw error;
    }
}

export async function fetchCardTransactions (context, { cardId, page = 1, page_size = 10 } = {}) {
    try {
        let cardData = context.state.cards.find(c => c.id === cardId);
        if (!cardData) {
            const cardUser = await loadCardUser();
            const fetchedCard = await cardUser.fetchCardByIdentifier(cardId);
            if (fetchedCard) {
                const plainCard = toPlainCard(fetchedCard);
                context.commit('addCard', plainCard);
                cardData = plainCard;
            } else {
                throw new Error(`Card with ID ${cardId} not found`);
            }
        }
        const card = await hydrateCard(cardData);
        let transactions = await card.getTransactions({ page, page_size });
        if (!Array.isArray(transactions)) {
            console.error('fetchCardTransactions returned non-array:', transactions);
            throw new Error('fetchCardTransactions did not return an array');
        }
        console.log('Fetched transactions:', transactions);
        const merchantRefIds = [...new Set(transactions.map(tx => tx.merchant?.ref_id).filter(id => id != null))];
        console.log('Merchant reference IDs to fetch:', merchantRefIds);

        const merchants = await posBackend.get(`paytacapos/merchants/`, { params: { ids: merchantRefIds.join(',') } }).then(res => res.data?.results);
        console.log('Fetched merchants:', merchants);

        transactions = transactions.map(tx => ({
            id: tx.id,
            type: tx.type,
            txid: tx.txid,
            merchant: tx.merchant ? {
                id: tx.merchant?.ref_id,
                name: merchants.find(merchant => merchant.id === tx.merchant?.ref_id)?.name || 'Unknown Merchant',
            } : null,
            amount: satoshiToBch(tx.value),
            is_nft: tx.is_nft,
            token_data: tx.token_data,
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

export async function fetchCardBalance (context, cardId) {
    try {
        let cardData = context.state.cards.find(c => c.id === cardId);
        if (!cardData) {
            const cardUser = await loadCardUser();
            const fetchedCard = await cardUser.fetchCardByIdentifier(cardId);
            cardData = toPlainCard(fetchedCard);
            if (cardData) {
                context.commit('addCard', cardData);
            }
        }
        if (!cardData) {
            throw new Error(`Card with ID ${cardId} not found`);
        }
        const card = await hydrateCard(cardData);
        const balanceSats = await card.getBchBalance();
        const balance = satoshiToBch(balanceSats);
        context.commit('updateCardBalance', { cardId, balance });
        return balance;
    } catch (error) {
        console.error('Error in fetchCardBalance action:', error);
        throw error;
    }
}

export async function updateCardLockStatus(context, { cardId, isLocked }) {
    try {
        const cardData = context.state.cards.find(c => c.id === cardId);
        if (!cardData) {
            throw new Error(`Card with ID ${cardId} not found`);
        }
        const card = await hydrateCard(cardData);
        let updatedCard = await card.update({ is_locked: isLocked });
        const plainCard = toPlainCard(updatedCard);
        context.commit('updateCard', plainCard);
        return plainCard;
    } catch (error) {
        console.error('Error in updateCardLockStatus action:', error);
        throw error;
    }
}

export async function updateCardAlertsStatus(context, { cardId, isAlertsEnabled }) {
    try {
        const cardData = context.state.cards.find(c => c.id === cardId);
        if (!cardData) {
            throw new Error(`Card with ID ${cardId} not found`);
        }
        const card = await hydrateCard(cardData);
        let updatedCard = await card.update({ is_alerts_enabled: isAlertsEnabled });
        const plainCard = toPlainCard(updatedCard);
        context.commit('updateCard', plainCard);
        return plainCard;
    } catch (error) {
        console.error('Error in updateCardAlertsStatus action:', error);
        throw error;
    }
}

export async function fetchMerchantList(context, { coordinates, radius = 10, page = 1, page_size = 20 } = {}) {
    try {
        const params = {
            limit: page_size,
            offset: (page - 1) * page_size,
            location: coordinates,
            radius: radius
        }
        const response = await getMerchantList(params)
        const merchants = response?.results || []
        console.log('___________merchants:', merchants)
        context.commit('setMerchants', merchants);
        return merchants;
    } catch (error) {
        console.error('Error in fetchMerchantList action:', error);
        throw error;
    }
}