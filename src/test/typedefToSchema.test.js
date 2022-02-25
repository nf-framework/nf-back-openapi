import assert from 'assert';
import { parse } from 'comment-parser';
import * as testing from '../typedefToSchema.js';

describe('@nfjs/back-openapi/src/typedefToSchema', () => {
    describe('typedefToSchema', () => {
        it('simple', () => {
            // Arrange
            const t =`
            const k = 1;
            /**
             * Тип
             * @typedef {Object} Tp
             * @property {string} dat Дата
             * @property {number} num Число
             * @property {string} str Строка
             * @propertyOpenapi {dat} format date
             * @propertyOpenapi {dat} example 01.01.1990 
             */
            `;
            // Act
            const res = testing.typedefToSchema(parse(t)[0]);
            // Assert
            const expected = {
                type: "object",
                description: "Тип",
                title: 'Tp',
                properties: {
                    dat: {
                        type: "string",
                        description: "Дата",
                        format: "date",
                        example: "01.01.1990"
                    },
                    num: {
                        type: "number",
                        description: "Число"
                    },
                    str: {
                        type: "string",
                        description: "Строка"
                    }
                },
                required: [
                    "dat",
                    "num",
                    "str"
                ]
            };
            assert.deepStrictEqual(expected, res);
        });
        it('nullable-property [name]', () => {
            // Arrange
            const t =`
            /**
             * Тип
             * @typedef {Object} Tp
             * @property {string} [dat] Дата
             * @property {number} num Число 
             */
            `;
            // Act
            const res = testing.typedefToSchema(parse(t)[0]);
            // Assert
            const expected = {
                type: "string",
                description: "Дата",
                nullable: true
            };
            assert.deepStrictEqual(expected, res.properties.dat);
        });
        it('array-property type[]', () => {
            // Arrange
            const t =`
            /**
             * Тип
             * @typedef {Object} Tp
             * @property {string[]} dat Дата
             */
            `;
            // Act
            const res = testing.typedefToSchema(parse(t)[0]);
            // Assert
            const expected = {
                type: "array",
                items: {
                    type: 'string'
                },
                description: "Дата"
            };
            assert.deepStrictEqual(expected, res.properties.dat);
        });
        it('array-property Array<type>', () => {
            // Arrange
            const t =`
            /**
             * @typedef {Object} Tp Тип
             * @property {Array<string>} dat Дата
             */
            `;
            // Act
            const res = testing.typedefToSchema(parse(t)[0]);
            // Assert
            const expected = {
                type: "array",
                items: {
                    type: 'string'
                },
                description: "Дата"
            };
            assert.deepStrictEqual(expected, res.properties.dat);
        });
        it('another-typedef-property', () => {
            // Arrange
            const t =`
            /**
             * Тип
             * @typedef {Object} Tp
             * @property {Tpp} tpp Другой тип
             */
            `;
            // Act
            const res = testing.typedefToSchema(parse(t)[0]);
            // Assert
            const expected = {
                $ref: '#/components/schemas/Tpp',
                description: 'Другой тип'
            };
            assert.deepStrictEqual(expected, res.properties.tpp);
        });
        it('another-typedef-property array', () => {
            // Arrange
            const t =`
            /**
             * Тип
             * @typedef {Object} Tp
             * @property {Tpp[]} tpp Другой тип
             */
            `;
            // Act
            const res = testing.typedefToSchema(parse(t)[0]);
            // Assert
            const expected = {
                description: 'Другой тип',
                items: {
                    '$ref': '#/components/schemas/Tpp'
                },
                type: 'array'
            };
            assert.deepStrictEqual(expected, res.properties.tpp);
        });
        it('multi primitive type', () => {
            // Arrange
            const t =`
            /**
             * Тип
             * @typedef {Object} Tp
             * @property {string|boolean} mt Мультитип
             */
            `;
            // Act
            const res = testing.typedefToSchema(parse(t)[0]);
            // Assert
            const expected = {
                description: 'Мультитип',
                oneOf: [{type: 'string'},{type: 'boolean'}]
            };
            assert.deepStrictEqual(expected, res.properties.mt);
        });
        it('multi primitive type in parenthesis', () => {
            // Arrange
            const t =`
            /**
             * Тип
             * @typedef {Object} Tp
             * @property {(string|boolean)} mt Мультитип
             */
            `;
            // Act
            const res = testing.typedefToSchema(parse(t)[0]);
            // Assert
            const expected = {
                description: 'Мультитип',
                oneOf: [{type: 'string'},{type: 'boolean'}]
            };
            assert.deepStrictEqual(expected, res.properties.mt);
        });
        it('multi other type', () => {
            // Arrange
            const t =`
            /**
             * Тип
             * @typedef {Object} Tp
             * @property {(string|FooType)} mt Мультитип
             */
            `;
            // Act
            const res = testing.typedefToSchema(parse(t)[0]);
            // Assert
            const expected = {
                description: 'Мультитип',
                oneOf: [{type: 'string'},{$ref: '#/components/schemas/FooType'}]
            };
            assert.deepStrictEqual(expected, res.properties.mt);
        });
        it('enum number', () => {
            // Arrange
            const t =`
            /**
             * Тип
             * @typedef {Object} Tp
             * @property {1|2} mt Мультитип
             */
            `;
            // Act
            const res = testing.typedefToSchema(parse(t)[0]);
            // Assert
            const expected = {
                description: 'Мультитип',
                type: 'integer',
                enum: [1,2]
            };
            assert.deepStrictEqual(expected, res.properties.mt);
        });
        it('enum string', () => {
            // Arrange
            const t =`
            /**
             * Тип
             * @typedef {Object} Tp
             * @property {'1'|'2'} mt Мультитип
             */
            `;
            // Act
            const res = testing.typedefToSchema(parse(t)[0]);
            // Assert
            const expected = {
                description: 'Мультитип',
                type: 'string',
                enum: ['1','2']
            };
            assert.deepStrictEqual(expected, res.properties.mt);
        });
        it('object in record', () => {
            // Arrange
            const t =`
            /**
             * Тип
             * @typedef {Object} Tp
             * @property {{foo: number, too: string}} obj Объект
             */
            `;
            // Act
            const res = testing.typedefToSchema(parse(t)[0]);
            // Assert
            const expected = {
                description: 'Объект',
                type: 'object',
                properties: {
                    foo: {
                        type: 'number'
                    },
                    too: {
                        type: 'string'
                    }
                }
            };
            assert.deepStrictEqual(expected, res.properties.obj);
        });
        it('full', () => {
            // Arrange
            const t =`
/**
 * Тип
 * @typedef {Object} Typ
 * @property {string} prim Примитив
 * @property {Array<string>} arrPrim1 Массив примитивов вариант 1
 * @property {string[]} arrPrim2 Массив примитивов вариант2
 * @property {Object} obj Объект с отдельными свойствами
 * @property {string} obj.prim Свойство объекта
 * @property {{str: string, num: number}} inlineObj Объект сразу с описанием
 * @property {string} [optional] Необязательное для наличия в типе свойство
 * @property {string|Object} multi Вариативный тип
 * @property {1|2|3} numEnum Числовое перечисление
 * @property {'a'|'b'|'ab'} strEnum Строковое перечисление
 * @property {AnotherTyp} atype Тип описанный в отдельном @typedef 
 * @property {Array<AnotherTyp>} arrAtype Массив типа описанного в отдельном @typedef, возможен также AnotherTyp[]
 */
            `;
            // Act
            const res = testing.typedefToSchema(parse(t)[0]);
            // Assert
            const expected = {
                description: 'Объект сразу с описанием',
                type: 'object',
                properties: {
                    num: {
                        type: 'number'
                    },
                    str: {
                        type: 'string'
                    }
                }
            };
            assert.deepStrictEqual(expected, res.properties.inlineObj);
        });
    });
});
