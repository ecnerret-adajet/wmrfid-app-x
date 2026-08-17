import axios from 'axios';
import ExcelJS from 'exceljs';

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

function buildSummaryWorksheet(workbook, { title, dates, rows }) {
    const worksheet = workbook.addWorksheet(title)

    // Header
    worksheet.addRow([
        'Type',
        ...dates
    ])

    rows.forEach(row => {
        worksheet.addRow([
            row.label,
            ...row.values
        ])
    })

    // Header styling
    const headerRow = worksheet.getRow(1)

    headerRow.font = {
        bold: true
    }

    headerRow.alignment = {
        horizontal: 'center',
        vertical: 'middle'
    }

    // Type column
    worksheet.getColumn(1).width = 25

    // Date columns
    for (let i = 2; i <= dates.length + 1; i++) {
        worksheet.getColumn(i).width = 15
    }

    // Center values
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
            row.eachCell((cell, columnNumber) => {
                if (columnNumber > 1) {
                    cell.alignment = {
                        horizontal: 'center'
                    }
                }
            })
        }
    })

    // Make Total row (last row) bold
    const totalRow = worksheet.getRow(rows.length + 1)

    totalRow.font = {
        bold: true
    }

    // Freeze Type column
    worksheet.views = [
        {
            state: 'frozen',
            xSplit: 1,
            ySplit: 1
        }
    ]

    return worksheet
}

export async function exportSummaryExcel({
    data = [],
    filename = 'putaway-summary.xlsx'
}) {
    try {
        const workbook = new ExcelJS.Workbook()

        const dates = data.map(row => row.date)

        buildSummaryWorksheet(workbook, {
            title: 'Summary Per Type',
            dates,
            rows: [
                { label: 'Good', values: data.map(row => Number(row.good_non_loose || 0)) },
                { label: 'Empty', values: data.map(row => Number(row.empty || 0)) },
                { label: 'Inline Rejected', values: data.map(row => Number(row.inline_rejected || 0)) },
                { label: 'Loose', values: data.map(row => Number(row.is_loose || 0)) },
                { label: 'Total', values: data.map(row => Number(row.total || 0)) },
            ]
        })

        buildSummaryWorksheet(workbook, {
            title: 'Pallet RFID Condition Summary',
            dates,
            rows: [
                { label: 'Active', values: data.map(row => Number(row.total || 0) - Number(row.weak_pallet || 0)) },
                { label: 'Weak', values: data.map(row => Number(row.weak_pallet || 0)) },
                { label: 'Total', values: data.map(row => Number(row.total || 0)) },
            ]
        })

        buildSummaryWorksheet(workbook, {
            title: 'Pallet QR Code Tracking Summary',
            dates,
            rows: [
                { label: 'With QR Code', values: data.map(row => Number(row.with_qr || 0)) },
                { label: 'No QR Code', values: data.map(row => Number(row.total || 0) - Number(row.with_qr || 0)) },
                { label: 'Total', values: data.map(row => Number(row.total || 0)) },
            ]
        })

        const buffer = await workbook.xlsx.writeBuffer()

        const blob = new Blob(
            [buffer],
            {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            }
        )

        const blobUrl = window.URL.createObjectURL(blob)

        const link = document.createElement('a')

        link.href = blobUrl
        link.download = filename

        document.body.appendChild(link)
        link.click()
        link.remove()

        window.URL.revokeObjectURL(blobUrl)

    } catch (error) {
        console.error('Summary export failed:', error)
        throw error
    }
}

