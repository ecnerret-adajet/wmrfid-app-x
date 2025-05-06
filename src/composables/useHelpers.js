export const generateSlug = (str) => {
    return str
        .toLowerCase()           // Convert to lowercase
        .replace(/\s+/g, '-')     // Replace spaces with hyphens
        .replace(/[^\w\-]+/g, '') // Remove non-alphanumeric characters (except hyphens)
        .replace(/--+/g, '-')     // Replace multiple hyphens with a single hyphen
        .replace(/^-+/, '')       // Remove leading hyphens
        .replace(/-+$/, '');      // Remove trailing hyphens
};

export const convertSlugToUpperCase = (slug) => {
    return slug.replace(/-/g, ' ').toUpperCase();
};

export const numberWithComma = (number) => {
    const parsed = Number(number);

    if (!isNaN(parsed)) {
        return parsed.toLocaleString('en-US', {
            maximumFractionDigits: 0,
        });
    }

    return '0';
};
