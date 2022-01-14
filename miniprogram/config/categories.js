import categories from './tags'

const iconMap = {}
categories.forEach(item => {
  iconMap[item.name] = item.icon
})

export const categoriesIconMap = iconMap

export const categoriesName = categories.map(item => item.name)

export const defaultIcon = '/images/icon_default.png'