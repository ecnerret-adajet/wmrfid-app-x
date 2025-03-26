export const generateSlug = (str) => {
    return str
        .toLowerCase()           // Convert to lowercase
        .replace(/\s+/g, '-')     // Replace spaces with hyphens
        .replace(/[^\w\-]+/g, '') // Remove non-alphanumeric characters (except hyphens)
        .replace(/--+/g, '-')     // Replace multiple hyphens with a single hyphen
        .replace(/^-+/, '')       // Remove leading hyphens
        .replace(/-+$/, '');      // Remove trailing hyphens
};

export const convertSlugToOriginal = (slug) => {
    return slug
        .replace(/-/g, ' ') // Replace hyphens with spaces
        .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize each word
};
