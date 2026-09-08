
import { satoshiToBch } from 'src/exchange';
import { loadCardUser } from 'src/services/card/user';
import { backend as posBackend } from "src/wallet/pos";
import { Card, normalizeContractHistoryList } from 'src/services/card/card';
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

export async function fetchCardTransactions (context, { cardId, page = 1, page_size = 25 } = {}) {
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
        const rawTransactions = await card.getTransactions({ page, page_size });
        if (!Array.isArray(rawTransactions)) {
            throw new Error('fetchCardTransactions did not return an array');
        }
        const rows = normalizeContractHistoryList(rawTransactions);
        const merchantRefIds = [...new Set(rows.map(tx => tx.merchantRefId).filter(id => id != null))];
        let merchantsById = {};
        if (merchantRefIds.length) {
            try {
                const merchants = await posBackend.get(`paytacapos/merchants/`, { params: { ids: merchantRefIds.join(',') } }).then(res => res.data?.results || []);
                merchantsById = Object.fromEntries((merchants || []).map(m => [m.id, m]));
            } catch {}
        }
        const transactions = rows.map(tx => {
            const merchantName = tx.merchantRefId != null
                ? (merchantsById[tx.merchantRefId]?.name || `Merchant #${tx.merchantRefId}`)
                : null;
            return {
                ...tx,
                displayAmount: tx.is_token ? tx.amount : satoshiToBch(tx.value),
                merchant: tx.merchant ? { ...tx.merchant, name: merchantName } : null,
                created_at_display: tx.created_at ? (new Date(tx.created_at)).toLocaleString() : '',
            };
        });
        context.commit('setCardTransactions', { cardId, transactions });
        return transactions;
    } catch (error) {
        console.error('Error in fetchCardTransactions action:', error);
        throw error;
    }
}

export async function refreshCardTransactions (context, { cardId } = {}) {
    return fetchCardTransactions(context, { cardId, page: 1, page_size: 25 });
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
        context.commit('setMerchants', merchants);
        return merchants;
    } catch (error) {
        console.error('Error in fetchMerchantList action:', error);
        throw error;
    }
}