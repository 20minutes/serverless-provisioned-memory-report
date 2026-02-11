function padLeft(text = '', maxLength = 13) {
  return text.length < maxLength
    ? `${' '.repeat(maxLength - text.length)}${text}`
    : text.substring(0, maxLength)
}

function padRight(text = '', maxLength = 13) {
  return text.length < maxLength
    ? `${text}${' '.repeat(maxLength - text.length)}`
    : text.substring(text.length - maxLength)
}

function fillDash(length) {
  return '-'.repeat(length)
}

function getLines(columns) {
  const columnsWidth = columns.reduce((sum, col) => (col.width ?? 10) + sum, 0)

  return fillDash(columnsWidth + columns.length - 1)
}

function getCol(column, row = {}) {
  const align = column.align ?? 'left'
  const width = column.width ?? 10
  const prefix = column.prefix ?? ''
  const suffix = column.suffix ?? ''
  const value = row[column.dataIndex]
  const pad = align === 'right' ? padLeft : padRight

  return pad(`${prefix}${value}${suffix}`, width)
}

function getRow(columns, row) {
  if (row === '-') {
    return getLines(columns)
  }

  return columns.map((column) => getCol(column, row)).join(' ')
}

function getHeaderCol(column) {
  const align = column.align ?? 'left'
  const width = column.width ?? 10
  const pad = align === 'right' ? padLeft : padRight

  return pad(column.title, width)
}

function getHeaderRow(columns) {
  return columns.map((column) => getHeaderCol(column)).join(' ')
}

export default function slackTable({ title = '', columns = [], dataSource = [] }) {
  const rows = [getHeaderRow(columns), ...dataSource.map((row) => getRow(columns, row))].join('\n')

  return `*${title}*\n\`\`\`${rows}\`\`\``
}
