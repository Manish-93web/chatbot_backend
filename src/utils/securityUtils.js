/**
 * Utility for PII masking and security
 */

/**
 * Mask an email address (e.g., test@example.com -> t***@e***.com)
 * @param {string} email 
 * @returns {string}
 */
const maskEmail = (email) => {
    if (!email || !email.includes('@')) return email;
    const [user, domain] = email.split('@');
    const maskedUser = user.length > 2 ? `${user[0]}***${user[user.length - 1]}` : `${user[0]}***`;
    const [domainName, tld] = domain.split('.');
    const maskedDomain = domainName.length > 2 ? `${domainName[0]}***${domainName[domainName.length - 1]}` : `${domainName[0]}***`;
    return `${maskedUser}@${maskedDomain}.${tld}`;
};

/**
 * Mask a phone number (e.g., +1234567890 -> +12****90)
 * @param {string} phone 
 * @returns {string}
 */
const maskPhone = (phone) => {
    if (!phone) return phone;
    const str = String(phone);
    if (str.length < 6) return '****';
    return `${str.substring(0, 3)}****${str.substring(str.length - 2)}`;
};

/**
 * Scan text for common PII patterns and mask them
 * @param {string} text 
 * @returns {string}
 */
const maskPII = (text) => {
    if (!text || typeof text !== 'string') return text;
    
    // Email regex
    let masked = text.replace(/([a-zA-Z0-9._-]+)@([a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi, (match) => maskEmail(match));
    
    // Simple phone regex (detecting 10+ digits with optional +)
    masked = masked.replace(/(\+?\d{10,12})/g, (match) => maskPhone(match));
    
    return masked;
};

module.exports = {
    maskEmail,
    maskPhone,
    maskPII
};
