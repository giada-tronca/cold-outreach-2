module.exports = {
    semi: true,
    trailingComma: 'es5',
    singleQuote: true,
    printWidth: 80,
    tabWidth: 2,
    useTabs: false,
    bracketSpacing: true,
    arrowParens: 'avoid',
    endOfLine: 'lf',
    quoteProps: 'as-needed',
    bracketSameLine: false,
    jsxSingleQuote: true,
    overrides: [
        {
            files: '*.json',
            options: {
                printWidth: 200,
            },
        },
        {
            files: ['*.css', '*.scss'],
            options: {
                singleQuote: false,
            },
        },
    ],
}; 