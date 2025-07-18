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

hbs.registerHelper('splitValues', function(values) {
    if (!values) return [];
    // Try to split by comma, pipe, or space
    if (Array.isArray(values)) return values;
    return String(values).split(/[,| ]+/).map(v => v.trim()).filter(Boolean);
});

hbs.registerHelper('paginationPages', function(currentPage, totalPages, options) {
    let pages = [];
    currentPage = Number(currentPage);
    totalPages = Number(totalPages);
    if (totalPages <= 5) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        if (currentPage <= 3) {
            pages = [1,2,3,4,'...',totalPages];
        } else if (currentPage >= totalPages - 2) {
            pages = [1,'...',totalPages-3,totalPages-2,totalPages-1,totalPages];
        } else {
            pages = [1,'...',currentPage-1,currentPage,currentPage+1,'...',totalPages];
        }
    }
    return pages;
}); 