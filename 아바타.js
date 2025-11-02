// avatars.js

const AVATAR_SETS = {
    'default_bomber': {
        front: './아바타폴더/기본캐정면.png',
        back: './아바타폴더/기본캐뒷면.png',
        left: './아바타폴더/기본캐좌측.png',
        right: './아바타폴더/기본캐우측.png'
    },
    'penguin_parka': {
        front: './아바타폴더/펭귄정면.png',
        back: './아바타폴더/펭귄뒷면.png',
        left: './아바타폴더/펭귄좌측.png',
        right: './아바타폴더/펭귄우측.png'
    },
    'puppy_set': {
        front: './아바타폴더/강아지정면.png',
        back: './아바타폴더/강아지뒷면.png',
        left: './아바타폴더/강아지좌측.png',
        right: './아바타폴더/강아지우측.png'
    }
    // 여기에 새로운 아바타 세트를 추가하면 됩니다.
};

// [신규] 기본 아바타 목록 (index.html 에서 이동)
// 이 목록은 모든 유저가 기본으로 소유합니다.
window.characters = [
    { id: 'shinchan', name: '짱구', url: 'https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdna%2Fbtj3Xz%2FbtsOslasSQR%2FAAAAAAAAAAAAAAAAAAAAANSi3xb-G-klE5SGrcm3qYVlZBCa2p4lAQW-ur5sFv5B%2Fimg.png%3Fcredential%3DyqXZFxpELC7KVnFOS48ylbz2pIh7yKj8%26expires%3D1761922799%26allow_ip%3D%26allow_referer%3D%26signature%3DL4JaARX9UeMc1x3HEX9%252BiYMgkBo%253D' },
    { id: 'rabbit', name: '토끼', url: 'https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdna%2Fd4sIF5%2FbtsOrBrFNbx%2FAAAAAAAAAAAAAAAAAAAAAGlzcl2CnBRNice0ZVforcvPuCQVrVYIJJMJzpiU5Xoy%2Fimg.png%3Fcredential%3DyqXZFxpELC7KVnFOS48ylbz2pIh7yKj8%26expires%3D1761922799%26allow_ip%3D%26allow_referer%3D%26signature%3D8rYAnxk%252BzJ27%252BF8JI4xO9sOepso%253D' },
    { id: 'kitty', name: '키티', url: 'https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdna%2Fu8HL0%2FbtsOrvrsSbI%2FAAAAAAAAAAAAAAAAAAAAAD6quxA0NOwRomMpajpc7AogkQEVVHBE8qFSZOojjXYV%2Fimg.png%3Fcredential%3DyqXZFxpELC7KVnFOS48ylbz2pIh7yKj8%26expires%3D1761922799%26allow_ip%3D%26allow_referer%3D%26signature%3DL2i5AFz3MpGeXuU94JxiRRLY3ow%253D' },
    { id: 'hulk', name: '헐크', url: 'https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdna%2FDJoAa%2FbtsOr6khRdw%2FAAAAAAAAAAAAAAAAAAAAANqmOARkugQAPAXMQsyNVYdEymDLoTAEyfqH8l83OtGx%2Fimg.png%3Fcredential%3DyqXZFxpELC7KVnFOS48ylbz2pIh7yKj8%26expires%3D1761922799%26allow_ip%3D%26allow_referer%3D%26signature%3DkhVQFzhqbm7rk%252BptE48OZZODc0E%253D' },
    { id: 'pikachu', name: '피카츄', url: 'https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdna%2Fb0Kris%2FbtsOs4eKlqv%2FAAAAAAAAAAAAAAAAAAAAAA9SPudB6-XeoSVAEuIoQ_z5j1rVNDGaCkZrQqF5vrxa%2Fimg.png%3Fcredential%3DyqXZFxpELC7KVnFOS48ylbz2pIh7yKj8%26expires%3D1761922799%26allow_ip%3D%26allow_referer%3D%26signature%3Dbi9Efz%252F0TvXgvHYV8MOM8sEWA7M%253D' },
    { id: 'doraemon', name: '도라에몽', url: 'https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdna%2FBFvG5%2FbtsOsDBTT3x%2FAAAAAAAAAAAAAAAAAAAAAJtav6O267Z5aHlZab7ECdLPX3Vv2XR8qokO4vMdNRz1%2Fimg.png%3Fcredential%3DyqXZFxpELC7KVnFOS48ylbz2pIh7yKj8%26expires%3D1761922799%26allow_ip%3D%26allow_referer%3D%26signature%3D2ALDKEMAQLN1Iq8I8P%252BSbJVyVFk%253D' },
    { id: 'pochacco', name: '포챠코', url: 'https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdna%2Fn5t3U%2FbtsOtg0yJ08%2FAAAAAAAAAAAAAAAAAAAAANG-EfodIg95cKuwlZqJMnfcOJLelKY4HRHTtbiCDQDK%2Fimg.png%3Fcredential%3DyqXZFxpELC7KVnFOS48ylbz2pIh7yKj8%26expires%3D1761922799%26allow_ip%3D%26allow_referer%3D%26signature%3DdV4vTZutss%252Bx4BGMc7gBatYf6wg%253D' },
    { id: 'kuromi', name: '쿠로미', url: 'https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdna%2FbB2Nbp%2FbtsOtII3ACz%2FAAAAAAAAAAAAAAAAAAAAAFywlx-hEbAqGNjl41iDASpd61sSn2SIlhknfNgDLnE7%2Fimg.png%3Fcredential%3DyqXZFxpELC7KVnFOS48ylbz2pIh7yKj8%26expires%3D1761922799%26allow_ip%3D%26allow_referer%3D%26signature%3DpHsV58xQK6j8wfgjXudMj%252FNSlm0%253D' },
    { id: 'mymelody', name: '마이멜로디', url: 'https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdna%2FrWL76%2FbtsOslIhSXm%2FAAAAAAAAAAAAAAAAAAAAAGPqPglwyixXUOUSCEKUnAHxNFExt7E4TrID83QV9ReJ%2Fimg.png%3Fcredential%3DyqXZFxpELC7KVnFOS48ylbz2pIh7yKj8%26expires%3D1761922799%26allow_ip%3D%26allow_referer%3D%26signature%3DUWYfjTAW3LkaaQ9%252F2T%252FxKVfTyik%253D' },
    { id: 'charmander', name: '파이리', url: 'https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdna%2FcvJc5M%2FbtsOsEgwiML%2FAAAAAAAAAAAAAAAAAAAAALXi9dhiiznpJShlLty-J-CQyb5MZA0OSG2V6QBSxF0c%2Fimg.png%3Fcredential%3DyqXZFxpELC7KVnFOS48ylbz2pIh7yKj8%26expires%3D1761922799%26allow_ip%3D%26allow_referer%3D%26signature%3DvUjWFE%252FejnXRKsj3clviGKo3Qq4%253D' },
    { id: 'spiderman', name: '스파이더맨', url: 'https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdna%2FtWqKG%2FbtsOrUkd4we%2FAAAAAAAAAAAAAAAAAAAAAEPfLU_PTmDF0jOLTVNfqM7srG_P7qIqBfK0ut_vWQY0%2Fimg.png%3Fcredential%3DyqXZFxpELC7KVnFOS48ylbz2pIh7yKj8%26expires%3D1761922799%26allow_ip%3D%26allow_referer%3D%26signature%3Dyx9Wvr8GYZfeP%252FD2FcXrQPZzxKU%253D' },
    { id: 'ironman', name: '아이언맨', url: 'https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdna%2FbXJ8Tv%2FbtsOr2ChT1P%2FAAAAAAAAAAAAAAAAAAAAAPbirgGIEPAnpSi_H_pSkzrVyOBaYSETKJaZ_VutqCMr%2Fimg.png%3Fcredential%3DyqXZFxpELC7KVnFOS48ylbz2pIh7yKj8%26expires%3D1761922799%26allow_ip%3D%26allow_referer%3D%26signature%3DtAnwwZHdqPD%252B7Nf0gfMso1qfnXg%253D' },
    { id: 'spongebob', name: '스펀지밥', url: 'https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdna%2F0cKaC%2FbtsOr1QO0BQ%2FAAAAAAAAAAAAAAAAAAAAAIXwoxx1YDAnNF10iiLKCzniAGs6yfTgZ6MDMxjvY-FX%2Fimg.png%3Fcredential%3DyqXZFxpELC7KVnFOS48ylbz2pIh7yKj8%26expires%3D1761922799%26allow_ip%3D%26allow_referer%3D%26signature%3Dh83OP98fPmKQUwaruTFJVeBLnRg%253D' },
    { id: 'captain', name: '캡틴', url: 'https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdna%2FOz4VW%2FbtsOs1I42zk%2FAAAAAAAAAAAAAAAAAAAAALLqYVC-TV1nau2QidETnqw9AnU4nv2LQRS1_xBQFkrC%2Fimg.png%3Fcredential%3DyqXZFxpELC7KVnFOS48ylbz2pIh7yKj8%26expires%3D1761922799%26allow_ip%3D%26allow_referer%3D%26signature%3DJnnjHb8msvTXLcQv2ocUGegKr8s%253D' }
];

// [신규] 상점에서 구매 가능한 아바타 목록 (AVATAR_SETS 기반)
// 대기실.html의 showAvatarSelectModal 에서는 item.id, item.url, item.name 을 사용합니다.
// AVATAR_SETS에 정의된 아이템들을 기반으로 만듭니다.
// 가격(price) 등 상점 관련 정보는 이 파일이 아닌 포인트상점.js 등에서 정의하는 것이 맞으나,
// 여기서는 '구매 가능한 아이템 목록' 정의가 필요하므로 AVATAR_SETS를 기반으로 생성합니다.
// (대기실.html 에서는 price 속성을 사용하지 않습니다.)
window.avatarShopItems = [
    { 
        id: 'default_bomber', 
        name: '기본 봄버맨', 
        url: AVATAR_SETS['default_bomber'].front, // 대표 이미지로 front 사용
        price: 0 // 예시 (가격 정보는 실제 상점 로직에서 사용)
    },
    { 
        id: 'penguin_parka', 
        name: '펭귄 파카', 
        url: AVATAR_SETS['penguin_parka'].front,
        price: 500 // 예시
    },
    { 
        id: 'puppy_set', 
        name: '강아지 세트', 
        url: AVATAR_SETS['puppy_set'].front,
        price: 500 // 예시
    }
];