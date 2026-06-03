export function validateEgyptianNationalId(id: string): boolean {
  if (!/^\d{14}$/.test(id)) return false;

  const century = id[0];
  if (century !== '2' && century !== '3') return false;

  const month = parseInt(id.substring(3, 5));
  const day = parseInt(id.substring(5, 7));
  const governorate = parseInt(id.substring(7, 9));

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const validGovernorates = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,88];
  if (!validGovernorates.includes(governorate)) return false;

  return true;
}

export function extractDOBFromNationalId(id: string): Date | null {
  if (!validateEgyptianNationalId(id)) return null;

  const century = id[0] === '2' ? '19' : '20';
  const year = century + id.substring(1, 3);
  const month = id.substring(3, 5);
  const day = id.substring(5, 7);

  const date = new Date(`${year}-${month}-${day}`);
  if (isNaN(date.getTime())) return null;
  return date;
}
