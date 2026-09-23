// Canonical Hyderabad Metro line sequences.
// Names chosen to match common station names and OSM naming closely.
const RED = [
  'Miyapur',
  'JNTU College',
  'KPHB Colony',
  'Kukatpally',
  'Balanagar',
  'Moosapet',
  'Bharat Nagar',
  'Erragadda',
  'ESI Hospital',
  'S R Nagar',
  'Ameerpet',
  'Punjagutta',
  'Errum Manzil',
  'Khairatabad',
  'Lakdi-ka-pul',
  'Assembly',
  'Nampally',
  'Gandhi Bhavan',
  'Osmania Medical College',
  'M G Bus Station',
  'Malakpet',
  'New Market',
  'Musarambagh',
  'Dilsukhnagar',
  'Chaitanyapuri',
  'Victoria Memorial',
  'L B Nagar',
];

const BLUE = [
  'Nagole',
  'Uppal',
  'Stadium',
  'NGRI',
  'Habsiguda',
  'Tarnaka',
  'Mettuguda',
  'Secunderabad East',
  'Parade Grounds',
  'Paradise',
  'Rasoolpura',
  'Prakash Nagar',
  'Begumpet',
  'Ameerpet',
  'Madhura Nagar',
  'Yusufguda',
  'Road No. 5 Jubilee Hills',
  'Jubilee Hills Check Post',
  'Peddamma Gudi',
  'Madhapur',
  'Durgam Cheruvu',
  'HITEC City',
  'Raidurg',
];

const GREEN = [
  'JBS Parade Ground',
  'Secunderabad West',
  'Gandhi Hospital',
  'Musheerabad',
  'RTC Cross Roads',
  'Chikkadpally',
  'Narayanguda',
  'Sultan Bazaar',
  'M G Bus Station',
  'Salarjung Museum',
  'Charminar',
  'Shalibanda',
  'Shamsher Gunj',
  'Jungametta',
  'Falaknuma',
];

const LINES = {
  Red: RED,
  Blue: BLUE,
  Green: GREEN,
};

const INTERCHANGES = new Set(['Ameerpet', 'M G Bus Station', 'Parade Grounds']);

module.exports = { LINES, INTERCHANGES };