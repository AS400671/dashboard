/* jshint -W104, -W119, -W083 */
/*

                d8                           
        d88~\ _d88__ Y88b  / 888-~88e  888-~\
       C888    888    Y888/  888  888b 888   
        Y88b   888     Y8/   888  8888 888   
         888D  888      Y    888  888P 888   
       \_88P   "88_/   /     888-_88"  888   
                     _/      888             

                    Copyright 2022 stypr LLCcom

*/

const popInfo = {
    "pop.nyo.network.stypr.com": {
        "name": "New York, USA",
        "country": "us",
    },
    "pop.fre.network.stypr.com": {
        "name": "Fremont, USA",
        "country": "us",
    },
    "pop.par.network.stypr.com": {
        "name": "Paris, France",
        "country": "fr",
    },
    "pop.sel.network.stypr.com": {
        "name": "Seoul, South Korea",
        "country": "kr",
    },
};

const prefixDescriptionInfo = {
    "2602:fb7e::/48": "Anycasted Global Network",
    "2602:fb7e:a::/48": "New York PoP",
    "2602:fb7e:b::/48": "Fremont PoP",
    "2602:fb7e:c::/48": "Paris PoP",
    "2602:fb7e:d::/48": "Seoul PoP",
}

const communityInfo = [
    {
        "id": "400671:x:100",
        "description": "<b>Announced by AS400671</b>",
        "pref": 300,
    },
    {
        "id": "400671:x:101",
        "description": "Learned from <b>upstreams</b>",
        "pref": 100,
    },
    {
        "id": "400671:x:102",
        "description": "Learned from <b>customers</b>",
        "pref": 200,
    },
    {
        "id": "400671:x:103",
        "description": "Learned from <b>direct/private peers</b>",
        "pref": 200,
    },
    {
        "id": "400671:x:104",
        "description": "Learned from <b>healthcheck peers</b>",
        "pref": 50, 
    },
    {
        "id": "400671:x:200<br>~ 400671:x:299",
        "description": "Learned from <b>exchange points</b>",
        "pref": 150,
    },
    {
        "id": "400671:666:666",
        "description": "Blackhole / Null-routed <u>(dropped for customers)<u>",
        "pref": 0,
    },
    {
        "id": "400671:777:777",
        "description": "Debug-only <u>(dropped for customers)</u>",
        "pref": 0,
    },
];

const filterInfo = [
    {
        "name": "is_valid_rpki()",
        "description": "Rejects any invalid or non-determined <a href='https://en.wikipedia.org/wiki/Resource_Public_Key_Infrastructure'>RPKI</a> routes. Please refer to <a href='https://www.rfc-editor.org/rfc/rfc6811.html'>RFC6811</a> and <a href='https://www.rfc-editor.org/rfc/rfc8893.html'>RFC8893</a> for more information.",
    },
    {
        "name": "is_martian_v4()",
        "description": "Rejects any bogon IPv4 prefixes.",
    },
    {
        "name": "is_martian_v6()",
        "description": "Rejects any bogon IPv6 prefixes.",
    },
    {
        "name": "is_martian_asn()",
        "description": "Rejects any bogon ASNs, except for very specific cases with upstream providers.",
    },
    {
        "name": "is_small_prefix_v4()",
        "description": "Rejects any IPv4 routes smaller than /24.",
    },
    {
        "name": "is_small_prefix_v6()",
        "description": "Rejects any IPv6 routes smaller than /48.",
    },
    {
        "name": "is_short_aspath()",
        "description": "Rejects any routes without AS paths.",
    },
    {
        "name": "is_long_aspath()",
        "description": "Rejects any routes with long AS paths, which could potentially cause recursion attacks.",
    },
    {
        "name": "in_transit_path()",
        "description": "Rejects any routes with paths containing top-tier ASNs. Only applicable for exchange peers.",
    },
    {
        "name": "is_dprk_route()",
        "description": "Rejects any ASNs and potential IPv4 prefixes from <a href='https://www.hrnk.org/'>North Korea</a>.",
    }
]

/***************/

const popInfoKeys = Object.keys(popInfo);

const dataLoaded = {
    'infrastructure': {},
    'prefixes': {},
    'connectivity': {},
    'popDead': [],
    'community': communityInfo,
    'filters': filterInfo,
};

const generateRandomNumber = (min = 52, max = 235) => Math.floor(Math.random() * (max - min + 1) + min);
const generateRandomColor = () => {
    return `rgb(${ generateRandomNumber() }, ${ generateRandomNumber() }, ${ generateRandomNumber() })`;
};

const domCross = `
    <svg class="bi d-block" width="24" height="24">
        <use xlink:href="#dead" />
    </svg>
`;

const escapeHTML = (unsafe_str) => {
    return unsafe_str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/\'/g, '&#39;')
      .replace(/\//g, '&#x2F;');
};

const isObject = (item) => {
    return (item && typeof item === 'object' && !Array.isArray(item));
};

const mergeDeep = (target, ...sources) => {
    if (!sources.length) return target;
    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key]) Object.assign(target, {
                    [key]: {}
                });
                mergeDeep(target[key], source[key]);
            } else {
                Object.assign(target, {
                    [key]: source[key]
                });
            }
        }
    }
    return mergeDeep(target, ...sources);
};

const isIPAddress = (ip, prefix = false) => {
    const regexV6 = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/gi;
    const regexV4 = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/gi;
    const regexPrefixV6 = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/[0-9]{1,3}$/gi;
    const regexPrefixV4 = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\/[0-9]{1,3}$/gi;

    if (regexV6.test(ip)) return "v6";
    if (regexV4.test(ip)) return "v4";
    if (prefix) {
        if (regexPrefixV6.test(ip)) return "v6";
        if (regexPrefixV4.test(ip)) return "v4";
    }
    return false;
};

const isDomainName = (domainName) => {
    const regexDomain = /^(?:(?:(?:[a-zA-z\-]+)\:\/{1,3})?(?:[a-zA-Z0-9])(?:[a-zA-Z0-9\-\.]){1,61}(?:\.[a-zA-Z]{2,})+|\[(?:(?:(?:[a-fA-F0-9]){1,4})(?::(?:[a-fA-F0-9]){1,4}){7}|::1|::)\]|(?:(?:[0-9]{1,3})(?:\.[0-9]{1,3}){3}))(?:\:[0-9]{1,5})?$/gi;
    return regexDomain.test(domainName);
};

const convertSpeed = (speed) => {
    if (speed < 2 ** 10) return `${speed} Bytes`;
    if (speed < 2 ** 20) return `${(speed / 1000)} KB`;
    if (speed < 2 ** 30) return `${(speed / 1000 ** 2)} MB`;
    if (speed < 2 ** 40) return `${(speed / 1000 ** 3)} GB`;
    if (speed < 2 ** 50) return `${(speed / 1000 ** 4)} TB`;
    if (speed < 2 ** 60) return `${(speed / 1000 ** 5)} PB`;
    return `${(speed / 1000 ** 6)} Eb`;
}

const convertSpeedBps = (speed) => {
    return speed
        .replace("K", "Kbps")
        .replace("M", "Mbps")
        .replace("G", "Gbps")
        .replace("T", "Tbps")
        .replace("P", "Pbps")
        .replace("E", "Ebps");
}

const fetchTimeout = async (resource, options = {}, timeoutSecond = 5) => {
    let {
        timeout = timeoutSecond * 1000
    } = options;
    let controller = new AbortController();
    let id = setTimeout(() => controller.abort(), timeout);
    let response = await fetch(resource, {
        ...options,
        signal: controller.signal
    });
    clearTimeout(id);
    return response;
};
