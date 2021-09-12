export function classesInRange(byClassname, start, end) {
  return Object.entries(byClassname).filter((_, i) => i >= start && i <= end);
}

export function classesByName(byClassname, ...names) {
  return Object.entries(byClassname).find(([key]) => {
    for (const name of names) {
      if (key.includes(name)) {
        return true;
      }
    }
  });
}
