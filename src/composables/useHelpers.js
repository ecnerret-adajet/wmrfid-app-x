import axios from 'axios';
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


export async function exportExcel({ url, params = {}, filename = 'export.xlsx' }) {
    try {
        const response = await axios.get(url, {
            params,
            responseType: 'blob',
        })

        const blobUrl = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = blobUrl
        link.setAttribute('download', filename)
        document.body.appendChild(link)
        link.click()
        link.remove()
    } catch (error) {
        console.error('Export failed:', error)
        throw error
    }
}
