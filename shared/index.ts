export const getJWT = (cookieString: string) => {
    const cookies = cookieString.split('; ');
    const tokenCookie = cookies.find((cookie) => (new RegExp('^token=*').test(cookie)));
    return tokenCookie
        ? tokenCookie.split('token=')[1]
        : '';
};
