export function responsive({ byClassname, breakpoints }, ...classnames) {
  const occ = {};
  for (const classname of classnames) {
    const cls = classname.split(' ');
    for (const c of cls) {
      const propertyName = byClassname[c].split(':')[0];
      if (propertyName in occ) {
        occ[propertyName].push(c);
      } else {
        occ[propertyName] = [c];
      }
    }
  }
  const clashing = Object.entries(occ)
    .filter(([_, classnames]) => classnames.length > 1)
    .map(([_, classnames]) => [...new Set(classnames)]);

  let resp = '';
  for (const classnames of clashing) {
    for (const [i, classname] of classnames.entries()) {
      resp += `${breakpoints[i - 1] ? breakpoints[i - 1] + ':' : ''}${classname} `;
    }
  }
  return resp.trim();
}
