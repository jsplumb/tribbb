import typescript from 'rollup-plugin-typescript2';

export default {
    input: 'src/indexer.ts',
    output: [{
        name: 'Tribbb',
        file: 'dist/tribbb.js',
        format: 'umd'
    }],
    plugins: [
        typescript()
    ]
}