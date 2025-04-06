// आपकी फाइल में कहीं भी निम्न कोड शामिल किया जाएगा
// CSSRules एक्सेस करने की त्रुटि को संभालने के लिए
try {
  // मूल कोड जो cssRules को एक्सेस करता है
  // यहां हम केवल try-catch ब्लॉक जोड़ रहे हैं
} catch (error) {
  // त्रुटि को मौन रूप से संभालें और कंसोल में लॉग न करें
  if (!(error instanceof DOMException && error.name === 'SecurityError')) {
    console.error('CSS parsing error:', error);
  }
} 