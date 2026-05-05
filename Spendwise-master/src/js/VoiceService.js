export class VoiceService {
    constructor() {
        // specific browser support check
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            this.isSupported = false;
            return;
        }
        this.recognition = new SpeechRecognition();
        this.isSupported = true;
        this.recognition.continuous = false;
        this.recognition.lang = 'en-US';
        this.recognition.interimResults = false;
    }

    start(onResult, onError) {
        if (!this.isSupported) {
            onError("Voice API not supported in this browser.");
            return;
        }

        this.recognition.start();

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const parsedData = this.parseExpense(transcript);
            onResult(transcript, parsedData);
        };

        this.recognition.onerror = (event) => {
            onError(event.error);
        };
    }

    parseExpense(text) {
        const lowerText = text.toLowerCase();
        
        // 1. Find Amount (looks for numbers like 500, 10.50, etc.)
        const amountMatch = text.match(/(\d+(\.\d{1,2})?)/);
        const amount = amountMatch ? parseFloat(amountMatch[0]) : null;

        // 2. Find Category
        // We look for keywords that match your existing categories
        let category = null;
        const categories = {
            'food': ['food', 'grocery', 'groceries', 'snack', 'lunch', 'dinner', 'breakfast', 'coffee'],
            'transport': ['transport', 'taxi', 'uber', 'cab', 'bus', 'train', 'flight', 'gas', 'fuel'],
            'utilities': ['utility', 'bill', 'electric', 'water', 'internet', 'phone'],
            'entertainment': ['entertainment', 'movie', 'game', 'fun', 'netflix', 'cinema'],
            'shopping': ['shopping', 'buy', 'bought', 'clothes', 'shoe', 'gift']
        };

        for (const [catKey, keywords] of Object.entries(categories)) {
            if (keywords.some(k => lowerText.includes(k))) {
                // Capitalize first letter to match your Select options (e.g., "Food")
                category = catKey.charAt(0).toUpperCase() + catKey.slice(1); 
                break;
            }
        }

        // 3. Find Date (Today/Yesterday)
        let date = new Date();
        if (lowerText.includes('yesterday')) {
            date.setDate(date.getDate() - 1);
        }

        return {
            description: text, // Use the full spoken sentence as description
            amount: amount,
            category: category,
            date: date.toISOString().slice(0, 16) // Format: YYYY-MM-DDTHH:mm
        };
    }
}