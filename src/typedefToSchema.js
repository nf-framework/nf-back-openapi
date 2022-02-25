import { parse as jsdocTypeParser } from 'jsdoctypeparser';

const ref = (typ) => {
    if (jsonSchemaTypes.has(typ.toLowerCase())) return { type: typ.toLowerCase() };
    return {
        $ref: `#/components/schemas/${typ}`
    };
};

const jsonSchemaTypes = new Set(['null', 'boolean', 'object', 'array', 'number', 'string', 'integer']);
const booleanLiterals = new Set(['true', 'false']);
const jsonSchemaTypesAndLiterals = new Set([
    ...jsonSchemaTypes,
    ...booleanLiterals
]);

function typeProcessRecursive(node, nodeType, property, converter, collector) {
    if ((node.type === 'UNION' || node.type === 'INTERSECTION') && node.left.type === nodeType) {
        collector.push(converter(node.left[property]));
        return typeProcessRecursive(node.right, nodeType, property, converter, collector) && collector;
    }
    if (node.type === nodeType) {
        collector.push(converter(node[property]));
        return collector;
    }
    return false;
}

function typeToSchema(typeNode) {
    let schema;
    switch (typeNode.type) {
        case 'NAME': {
            let { name: typeName } = typeNode;
            if (jsonSchemaTypesAndLiterals.has(typeName.toLowerCase())) {
                schema = {
                    type: booleanLiterals.has(typeName.toLowerCase()) ? 'boolean' : typeName.toLowerCase()
                };
            } else {
                schema = {
                    $ref: `#/components/schemas/${typeName}`
                }
            }
            break;
        }
        case 'NUMBER_VALUE':
            schema = {
                type: Number.isInteger(Number.parseFloat(typeNode.number)) ? 'integer' : 'number',
                enum: [Number.parseFloat(typeNode.number)]
            };
            break;
        case 'STRING_VALUE':
            schema = {
                type: 'string',
                enum: [typeNode.string]
            };
            break;
        case 'UNION': {
            let enumArr = typeProcessRecursive(typeNode, 'STRING_VALUE', 'string', String, []);
            schema = {
                type: 'string'
            };
            if (!enumArr) {
                enumArr = typeProcessRecursive(typeNode, 'NUMBER_VALUE', 'number', Number, []);
                if (enumArr) {
                    schema.type = enumArr.every((num) => Number.isInteger(num)) ? 'integer' : 'number';
                } else {
                    const oneOf = typeProcessRecursive(typeNode, 'NAME', 'name', ref, []);
                    return { oneOf };
                }
            }
            schema.enum = enumArr;
            break;
        } case 'INTERSECTION': {
            const allOf = typeProcessRecursive(typeNode, 'NAME', 'name', ref, []);
            schema = {
                type: 'object',
                allOf
            };
            break;
        } case 'PARENTHESIS': {
            return typeToSchema(typeNode.value);
            break;
        } case 'ANY': {
            schema = {
                type: '{}'
            }
            break;
        } case 'RECORD': {
            schema = { type: 'object', properties: {} };
            typeNode.entries.forEach(e => {
                schema.properties[e.key] = typeToSchema(e.value)
            });
            break;
        } case 'GENERIC': {
            if (typeNode.subject.name.toLowerCase() === 'array') {
                schema = {
                    type: 'array',
                    items: typeToSchema(typeNode.objects[0])
                }
            } else {
                throw new TypeError(`Необрабатываемый подтип GENERIC ${typeNode.subject.name}`);
            }
            break;
        } default:
            throw new TypeError(`Необрабатываемый тип jsdoc ${typeNode.type}`);
    }
    return schema;
}

/**
 * Преобразование распарсенного @typedef описания в json schema формат
 * @param {Object} jsdocParsed объект, полученный парсом @typedef jsdoc описания библиотекой comment-parser
 * @returns {Object}
 */
function typedefToSchema(jsdocParsed) {
    // распарсенный jsdoc комментарий является typedef, иначе отбрасываем
    const typedefTag = jsdocParsed.tags.find(tag => tag.tag === 'typedef');
    if (!typedefTag) return undefined;
    // по-умолчанию возвращаемая схема
    let rootSchema = { type: 'object' };
    // основной тип типа: @typedef {тип} Zaqzaq
    try {
        // основной тип уже может быть не из списка jsonSchemaTypes, а сразу типа {{foo: string, bar: number}} или {boolean|string}
        const mainTypeAST = jsdocTypeParser(typedefTag.type);
        if (mainTypeAST.type) rootSchema = typeToSchema(mainTypeAST);
    } catch (e) {
    }

    if (typedefTag.name) rootSchema.title = typedefTag.name;
    // @typedef description берем из общего описания комментария
    if (jsdocParsed.description) rootSchema.description = jsdocParsed.description;

    const rootProperties = rootSchema.type === 'array' ? [] : {};
    const rootRequired = [];
    const nameMap = new Map();

    jsdocParsed.tags.forEach(({ tag, name, description, type, optional, default: defaultValue }) => {
        // нестандартный тег @propertyOpenapi специфичный для этого модуля
        if (tag === 'propertyOpenapi') {
            if (rootSchema.properties[type]) rootSchema.properties[type][name] = description;
            return;
        }
        // не обрабатываем теги, которые не относятся к свойствам
        if (tag !== 'property') return;
        const parsedType = (type === '') ? { type: '<UNTYPED>' } : jsdocTypeParser(type);
        const nameParts = name.split('.');
        const nme = nameParts[nameParts.length -1];
        const namePath = nameParts.slice(0, nameParts.length - 1).join('.');
        let schema, properties, required;
        // если обрабатывается property с именем типа someobject.props.foo
        if (namePath) {
            schema = nameMap.get(namePath);
            properties =
                (schema.type === 'array' ? schema.items : schema.properties) ||
                (schema.type === 'array' ? [] : {});
            required = schema.required || [];
        } else {
            schema = rootSchema;
            properties = rootProperties;
            required = rootRequired;
        }

        const property = parsedType.type === '<UNTYPED>' ? {} : typeToSchema(parsedType);
        if (description) property.description = description;
        if (defaultValue) {
            try {
                property.default = JSON.parse(defaultValue);
            } catch(e) {
                property.default = defaultValue;
            }
        }
        // запомнить уже обработанный property на случай если будут описаны его подсвойства
        if (namePath) {
            nameMap.set(`${namePath}.${nme}`, property);
        } else {
            nameMap.set(nme, property);
        }
        if (optional) property.nullable = true;
        if (schema.type === 'array') {
            if (!optional) {
                if (!schema.minItems) schema.minItems = 0;
                schema.minItems++;
            }
            properties.push(property);
        } else {
            properties[nme] = property;
            if (!optional && !required.includes(nme)) required.push(nme);
        }

        if (required.length) {
            schema.required = required;
        }
        if (schema.type === 'array') {
            schema.items = properties;
            schema.maxItems = properties.length;
        } else {
            schema.properties = properties;
        }
        if (!nameMap.has(namePath)) {
            nameMap.set(namePath, schema);
        }
    });
    return rootSchema;
}

export { typedefToSchema };
