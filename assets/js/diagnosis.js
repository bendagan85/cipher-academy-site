// What the answers say. The fit check's button uses CTA only to word itself —
// the full diagnosis (DIAGNOSIS) is shown on the thank-you page, once the
// details are already in.
export const PREREQ_KEY = 'cipher.prereq';
export const THANKS_KEY = 'cipher.thanks';

export const REQ_LABELS = {
  python: 'Python בסיסי',
  networks: 'רשתות: IP, DNS, HTTP',
  os: 'Windows בביטחון ו־Linux בסיסי',
  cli: 'שורת פקודה ומערכת קבצים',
  english: 'תיעוד טכני באנגלית',
  self: 'למידה עצמית וזמן לתרגל',
  pc: 'מחשב שמריץ מכונות וירטואליות',
};

export function readPrereq() {
  try { return JSON.parse(sessionStorage.getItem(PREREQ_KEY)) || null; } catch { return null; }
}

/**
 * @param {{grade?:string, practice?:string, drive?:string, why?:string}} a
 * @param {{n:number, of:number, items:string[], unsure:boolean}|null} prereq
 * @returns {'young'|'parent'|'check'|'prep'|'ready'|'close'}
 */
export function diagnose(a, prereq) {
  const n = prereq && !prereq.unsure && prereq.n > 0 ? prereq.n : null;
  if (a.grade === '9') return 'young';
  if (a.drive === 'me') return 'parent';
  if (a.practice === 'curious' || (n !== null && n <= 2)) return 'prep';
  if (a.practice === 'unsure' || a.grade === 'other' || prereq?.unsure) return 'check';
  if ((a.practice === 'built' || a.practice === 'class') && (n === null || n >= 5)) return 'ready';
  return 'close';
}

// The button under the fit check, once only the contact details are left.
// Warm in every case, and never a verdict.
export const CTA = {
  ready: 'שמרו לנו שיחת התאמה',
  close: 'לשיחת ההתאמה עם צוות Cipher',
  prep: 'לצעד הראשון שלהם עם Cipher',
  check: 'לצעד הבא, יחד איתם',
  parent: 'לצעד הבא שלכם עם Cipher',
  young: 'שמרו להם מקום מוקדם',
};

// The thank-you page: a headline that positions Cipher as premium, and the
// objection their own answers raised — handled, not argued with.
export const DIAGNOSIS = {
  ready: {
    head: 'נשמע שיש כאן בסיס אמיתי.',
    body: 'מהתשובות שלכם, זה נשמע כמו ילד שכבר הלך צעד או שניים לבד — בדיוק מי שהתכנית הזו נבנתה בשבילו. נחזור אליכם לשיחת טלפון קצרה, ומשם לראיון.',
  },
  close: {
    head: 'יש כאן כיוון טוב.',
    body: 'לא כל התשובות היו חד־משמעיות, וזה בסדר גמור — זו בדיוק הסיבה שיש שיחת טלפון לפני הראיון. נבדוק יחד מה כבר קיים ומה כדאי לחזק קודם.',
  },
  prep: {
    head: 'הם בהתחלה של הדרך, וזה בדיוק המקום להתחיל ממנו.',
    body: 'מי שעוד לא כתב קוד לבד לא פסול מהתכנית — הוא פשוט מתחיל שלב אחד קודם, במסלול ההכנה. למידה עצמית, מתחילה מיד, עם מבחן מסכם שמחזיר לשלבי הקבלה לתכנית המלאה.',
  },
  check: {
    head: 'קודם נכיר אותם קצת יותר.',
    body: 'הרבה הורים לא יודעים בדיוק מה הרמה של הילד שלהם, וזה הגיוני — זה לא תפקיד ההורה לבדוק את זה. בשיחה הקצרה נבין יחד איפה הם עומדים, ומשם נדע אם מתאים להתחיל ישר או דרך מסלול ההכנה.',
  },
  parent: {
    head: 'ההתלהבות שלכם חשובה, אבל היא לא מספיקה.',
    body: 'התכנית דורשת שהנער ירצה את זה בעצמו — לא רק שתרצו בשבילו. הצעד הכי טוב עכשיו: שהוא ינסה את אתגר Cipher בעצמו. אם זה תופס אותו, הוא יגיע אליכם.',
  },
  young: {
    head: 'עוד מוקדם, וזה דווקא יתרון.',
    body: 'המחזור מיועד לכיתות י׳–י״ב, ותלמידי ט׳ יכולים להתקבל בהחרגה. מה שכן מומלץ: להתחיל כבר עכשיו במסלול ההכנה, כדי שיגיעו למחזור הבא עם בסיס מוכן.',
  },
};
