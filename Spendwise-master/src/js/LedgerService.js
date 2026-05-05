export class LedgerService {
    constructor() {
        this.encoder = new TextEncoder();
    }

    /**
     * Generates a SHA-256 hash for a transaction.
     * Formula: Hash( prevHash + amount + category + date + description )
     */
    async generateHash(transaction, prevHash) {
        // 1. Create the data string (The "Block")
        const data = `${prevHash}|${transaction.amount}|${transaction.category}|${transaction.date}|${transaction.description}`;
        
        // 2. Convert to buffer
        const buffer = this.encoder.encode(data);
        
        // 3. Hash it (SHA-256)
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        
        // 4. Convert back to Hex string
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        return hashHex;
    }

    /**
     * Verifies the entire chain of transactions.
     * Returns true if valid, or the index of the tampered record.
     */
    async verifyChain(transactions) {
        // Sort by date (oldest first) to rebuild the chain
        // Note: We use the existing order in the array, assuming it's time-sorted or append-only.
        // For this feature, we verify the array as it is stored.
        
        // We iterate in reverse because your app adds new items to the START (unshift).
        // So the "Genesis" (oldest) block is at the END of the array.
        const chain = [...transactions].reverse(); 

        let computedPrevHash = "0"; // Genesis hash

        for (let i = 0; i < chain.length; i++) {
            const tx = chain[i];
            
            // If this is an old transaction without a hash, we skip verification (or flag it)
            if (!tx.hash) continue;

            // Check 1: Does the stored prevHash match what we calculated from the last one?
            if (tx.prevHash !== computedPrevHash) {
                console.error(`Broken Chain at index ${i}: stored prevHash '${tx.prevHash}' != computed '${computedPrevHash}'`);
                return { valid: false, errorIndex: transactions.length - 1 - i }; 
            }

            // Check 2: Does the stored hash match the data now? (Did someone edit the amount?)
            const validHash = await this.generateHash(tx, computedPrevHash);
            if (tx.hash !== validHash) {
                console.error(`Tampering detected at index ${i}: Data changed!`);
                return { valid: false, errorIndex: transactions.length - 1 - i };
            }

            // Update for next loop
            computedPrevHash = tx.hash;
        }

        return { valid: true };
    }
}