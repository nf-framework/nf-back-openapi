/**
 * Слияние объекта b в объект a
 * @param {Object} a
 * @param {Object} b
 */
export function mergeToObject(a, b) {
    for (const key in b) {
        if (key in a) {
            if (Array.isArray(a[key])) {
                const bArr = (Array.isArray(b[key])) ? b[key] : [b[key]];
                // массив сливаем, убирая дубликаты
                bArr.forEach(v => {
                    if (a[key].indexOf(v) === -1) a[key].push(v);
                })
            } else if (!!a[key] && typeof a[key] === 'object') {
                if (!!b[key] && typeof b[key] === 'object') mergeToObject(a[key], b[key]);
            } else {
                // примитивы оставляем какими были
            }
        } else {
            a[key] = b[key];
        }
    }
}