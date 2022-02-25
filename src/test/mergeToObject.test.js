import assert from 'assert';
import * as testing from '../mergeToObject.js';

describe('@nfjs/back-openapi/src/mergeToObject', () => {
    describe('mergeToObject', () => {
        it('primitive to empty', () => {
            // Arrange
            const a = {};
            const b = {a: 1};
            // Act
            testing.mergeToObject(a, b);
            // Assert
            const expected = {a: 1};
            assert.deepStrictEqual(expected, a);
        });
        it('primitive to primitive', () => {
            // Arrange
            const a = {a: 1};
            const b = {a: 2};
            // Act
            testing.mergeToObject(a, b);
            // Assert
            const expected = {a: 1};
            assert.deepStrictEqual(expected, a);
        });
        it('primitive to array', () => {
            // Arrange
            const a = {a: [1]};
            const b = {a: 2};
            // Act
            testing.mergeToObject(a, b);
            // Assert
            const expected = {a: [1,2]};
            assert.deepStrictEqual(expected, a);
        });
        it('primitive to object', () => {
            // Arrange
            const a = {a: {b: 1}};
            const b = {a: 2};
            // Act
            testing.mergeToObject(a, b);
            // Assert
            const expected = {a: {b: 1}};
            assert.deepStrictEqual(expected, a);
        });
        it('array to empty', () => {
            // Arrange
            const a = {};
            const b = {a: [1]};
            // Act
            testing.mergeToObject(a, b);
            // Assert
            const expected = {a: [1]};
            assert.deepStrictEqual(expected, a);
        });
        it('array to primitive', () => {
            // Arrange
            const a = {a: 1};
            const b = {a: [2]};
            // Act
            testing.mergeToObject(a, b);
            // Assert
            const expected = {a: 1};
            assert.deepStrictEqual(expected, a);
        });
        it('array to array', () => {
            // Arrange
            const a = {a: [1]};
            const b = {a: ['2']};
            // Act
            testing.mergeToObject(a, b);
            // Assert
            const expected = {a: [1,'2']};
            assert.deepStrictEqual(expected, a);
        });
        it('array to object', () => {
            // Arrange
            const a = {a: {b: 1}};
            const b = {a: [2]};
            // Act
            testing.mergeToObject(a, b);
            // Assert
            const expected = {a: {b: 1, 0: 2}};
            assert.deepStrictEqual(expected, a);
        });
        it('object to empty', () => {
            // Arrange
            const a = {};
            const b = {a: {b: 1}};
            // Act
            testing.mergeToObject(a, b);
            // Assert
            const expected = {a: {b: 1}};
            assert.deepStrictEqual(expected, a);
        });
        it('object to primitive', () => {
            // Arrange
            const a = {a: 1};
            const b = {a: {b: 2}};
            // Act
            testing.mergeToObject(a, b);
            // Assert
            const expected = {a: 1};
            assert.deepStrictEqual(expected, a);
        });
        it('object to array', () => {
            // Arrange
            const a = {a: [1]};
            const b = {a: {b: '2'}};
            // Act
            testing.mergeToObject(a, b);
            // Assert
            const expected = {a: [1,{b: '2'}]};
            assert.deepStrictEqual(expected, a);
        });
        it('object to object', () => {
            // Arrange
            const a = {a: {b: 1}};
            const b = {a: {b: 2, c: 3}};
            // Act
            testing.mergeToObject(a, b);
            // Assert
            const expected = {a: {b: 1, c: 3}};
            assert.deepStrictEqual(expected, a);
        });
    });
});
