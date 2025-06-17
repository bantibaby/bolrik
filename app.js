const hbs = require('hbs');

// Register Handlebars helper functions
hbs.registerHelper('greaterThan', function(a, b) {
    return a > b;
});

hbs.registerHelper('lessThan', function(a, b) {
    return a < b;
});

hbs.registerHelper('eq', function(a, b) {
    return a === b;
});

hbs.registerHelper('not', function(value) {
    return !value;
});

hbs.registerHelper('subtract', function(a, b) {
    return a - b;
});

hbs.registerHelper('add', function(a, b) {
    return a + b;
});

hbs.registerHelper('calculateBetsPercentage', function(betsPlaced) {
    return Math.min((betsPlaced || 0) * 5, 100); // 5% per bet, max 100%
});

hbs.registerHelper('calculateProgressPercentage', function(progress) {
    return Math.min(progress || 0, 100);
});

hbs.registerHelper('calculateAvailableBonus', function(bonusAmount) {
    return Math.floor((bonusAmount || 0) * 0.3);
});

hbs.registerHelper('calculateLockedBonus', function(bonusAmount) {
    return Math.ceil((bonusAmount || 0) * 0.7);
});

hbs.registerHelper('lowercase', function(str) {
    return str.toLowerCase();
}); 