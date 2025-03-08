const toString36 = (num) => num.toString(36).substring(2);

export const getUid = () => toString36(Math.random()) + toString36(Date.now());