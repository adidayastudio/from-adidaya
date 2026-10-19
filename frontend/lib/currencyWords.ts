const enSmall = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const idSmall = ['nol','satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan','sepuluh','sebelas'];
function english(n: number): string {
    if (n < 20) return enSmall[n];
    if (n < 100) return ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'][Math.floor(n / 10)] + (n % 10 ? `-${english(n % 10)}` : '');
    if (n < 1000) return english(Math.floor(n / 100)) + ' hundred' + (n % 100 ? ` ${english(n % 100)}` : '');
    for (const [value, word] of [[1e15,'quadrillion'],[1e12,'trillion'],[1e9,'billion'],[1e6,'million'],[1e3,'thousand']] as const) if (n >= value) return `${english(Math.floor(n / value))} ${word}${n % value ? ` ${english(n % value)}` : ''}`;
    return '';
}
function indonesian(n: number): string {
    if (n < 12) return idSmall[n];
    if (n < 20) return `${indonesian(n - 10)} belas`;
    if (n < 100) return `${indonesian(Math.floor(n / 10))} puluh${n % 10 ? ` ${indonesian(n % 10)}` : ''}`;
    if (n < 200) return `seratus${n % 100 ? ` ${indonesian(n % 100)}` : ''}`;
    if (n < 1000) return `${indonesian(Math.floor(n / 100))} ratus${n % 100 ? ` ${indonesian(n % 100)}` : ''}`;
    if (n < 2000) return `seribu${n % 1000 ? ` ${indonesian(n % 1000)}` : ''}`;
    for (const [value, word] of [[1e15,'kuadriliun'],[1e12,'triliun'],[1e9,'miliar'],[1e6,'juta'],[1e3,'ribu']] as const) if (n >= value) return `${indonesian(Math.floor(n / value))} ${word}${n % value ? ` ${indonesian(n % value)}` : ''}`;
    return '';
}
export function currencyWords(amount: number) {
    if (!Number.isFinite(amount) || amount < 0 || !Number.isSafeInteger(Math.floor(amount))) return { en: '—', id: '—' };
    let value = Math.floor(amount), cents = Math.round((amount - value) * 100);
    if (cents === 100) { value++; cents = 0; }
    const capitalize = (text: string) => text[0].toUpperCase() + text.slice(1);
    return { en: `${capitalize(english(value))} rupiah${cents ? ` and ${english(cents)} sen` : ''}`, id: `${capitalize(indonesian(value))} rupiah${cents ? ` ${indonesian(cents)} sen` : ''}` };
}
