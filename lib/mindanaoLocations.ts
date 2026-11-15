export type MindanaoLocation = {
  province: string
  municipalities: string[]
}

// The checkout directory is intentionally limited to Mindanao provinces and
// their municipalities/cities. Barangay names are kept in a separate map so
// the form can remain lightweight and cascade without an external service.
export const MINDANAO_LOCATIONS: MindanaoLocation[] = [
  { province: "Agusan del Norte", municipalities: ["Buenavista", "Cabadbaran City", "Carmen", "Jabonga", "Kitcharao", "Las Nieves", "Magallanes", "Nasipit", "Remedios T. Romualdez", "Santiago", "Tubay"] },
  { province: "Agusan del Sur", municipalities: ["Bayugan City", "Bunawan", "Esperanza", "La Paz", "Loreto", "Prosperidad", "Rosario", "San Francisco", "San Luis", "Santa Josefa", "Sibagat", "Talacogon", "Trento", "Veruela"] },
  { province: "Basilan", municipalities: ["Akbar", "Al-Barka", "Hadji Muhtamad", "Isabela City", "Lamitan City", "Lantawan", "Maluso", "Sumisip", "Tabuan-Lasa", "Tipo-Tipo", "Tuburan"] },
  { province: "Bukidnon", municipalities: ["Baungon", "Cabanglasan", "Damulog", "Dangcagan", "Don Carlos", "Impasug-ong", "Kadingilan", "Kalilangan", "Kibawe", "Kitaotao", "Lantapan", "Libona", "Malaybalay City", "Malitbog", "Manolo Fortich", "Maramag", "Pangantucan", "Quezon", "San Fernando", "Sumilao", "Talakag", "Valencia City"] },
  { province: "Camiguin", municipalities: ["Catarman", "Guinsiliban", "Mahinog", "Mambajao", "Sagay"] },
  { province: "Davao de Oro", municipalities: ["Compostela", "Laak", "Mabini", "Maco", "Maragusan", "Mawab", "Monkayo", "Montevista", "Nabunturan", "New Bataan", "Pantukan"] },
  { province: "Davao del Norte", municipalities: ["Asuncion", "Braulio E. Dujali", "Carmen", "Kapalong", "New Corella", "Panabo City", "Samal", "San Isidro", "Santo Tomas", "Tagum City", "Talaingod"] },
  { province: "Davao del Sur", municipalities: ["Bansalan", "Davao City", "Digos City", "Hagonoy", "Kiblawan", "Magsaysay", "Malalag", "Matanao", "Padada", "Santa Cruz", "Sulop"] },
  { province: "Davao Occidental", municipalities: ["Don Marcelino", "Jose Abad Santos", "Malita", "Santa Maria", "Sarangani"] },
  { province: "Davao Oriental", municipalities: ["Baganga", "Banaybanay", "Boston", "Caraga", "Cateel", "Governor Generoso", "Lupon", "Manay", "Mati City", "San Isidro", "Tarragona"] },
  { province: "Dinagat Islands", municipalities: ["Basilisa", "Cagdianao", "Dinagat", "Libjo", "Loreto", "San Jose", "Tubajon"] },
  { province: "Lanao del Norte", municipalities: ["Bacolod", "Balo-i", "Baroy", "Kapatagan", "Kauswagan", "Kolambugan", "Lala", "Linamon", "Magsaysay", "Maigo", "Matungao", "Munai", "Nunungan", "Pantao Ragat", "Pantar", "Poona Piagapo", "Salvador", "Sapad", "Sultan Naga Dimaporo", "Tagoloan", "Tangcal", "Tubod", "Tukuran"] },
  { province: "Lanao del Sur", municipalities: ["Bacolod Grande", "Balabagan", "Balindong", "Bayang", "Binidayan", "Butig", "Cagay-an de Sulu", "Datu Piang", "Ganassi", "Kapai", "Lumbaca-Unayan", "Lumbatan", "Lumbayanague", "Madamba", "Marantao", "Marawi City", "Masiu", "Matanog", "Pagayawan", "Piagapo", "Poona Bayabao", "Saguiaran", "Sultan Dumalondong", "Tamparan", "Taraka", "Tubaran", "Tugaya", "Wao"] },
  { province: "Maguindanao del Norte", municipalities: ["Barira", "Buldon", "Datu Blah T. Sinsuat", "Datu Odin Sinsuat", "Kabuntalan", "Kapatagan", "Matanog", "Northern Kabuntalan", "Parang", "Sultan Kudarat", "Sultan Mastura", "Talitay"] },
  { province: "Maguindanao del Sur", municipalities: ["Ampatuan", "Buluan", "Datu Abdullah Sangki", "Datu Anggal Midtimbang", "Datu Hoffer Ampatuan", "Datu Montawal", "Datu Paglas", "Datu Saudi-Ampatuan", "Datu Salibo", "Datu Unsay", "General Salipada K. Pendatun", "Guindulungan", "Pagagawan", "Pagalungan", "Paglat", "Pandag", "Rajah Buayan", "Shariff Aguak", "Shariff Saydona Mustapha", "South Upi"] },
  { province: "Misamis Occidental", municipalities: ["Aloran", "Baliangao", "Bonifacio", "Calamba", "Clarin", "Concepcion", "Don Victoriano Chiongbian", "Jimenez", "Lopez Jaena", "Oroquieta City", "Ozamiz City", "Panaon", "Plaridel", "Sapang Dalaga", "Sinacaban", "Tangub City", "Tudela"] },
  { province: "Misamis Oriental", municipalities: ["Alubijid", "Balingasag", "Balingoan", "Binuangan", "Cagayan de Oro City", "Claveria", "El Salvador City", "Gingoog City", "Gitagum", "Initao", "Jasaan", "Lagonglong", "Laguindingan", "Libertad", "Lugait", "Magsaysay", "Manticao", "Medina", "Naawan", "Opol", "Salay", "Sugbongcogon", "Tagoloan", "Talisayan", "Villanueva"] },
  { province: "Negros Occidental", municipalities: ["Bacolod City", "Bago City", "Cadiz City", "Calatrava", "Enrique B. Magalona", "Escalante City", "Himamaylan City", "Hinigaran", "Hinoba-an", "Kabankalan City", "La Carlota City", "Manapla", "Moises Padilla", "Murcia", "Pontevedra", "Pulupandan", "Sagay City", "Salvador Benedicto", "San Carlos City", "Silay City", "Sipalay City", "Talisay City", "Toboso", "Valladolid", "Victorias"] },
  { province: "North Cotabato", municipalities: ["Alamada", "Aleosan", "Antipas", "Arakan", "Banisilan", "Carmen", "Kabacan", "Kidapawan City", "Libungan", "Magpet", "Makilala", "Matalam", "Midsayap", "Pigcawayan", "Pikit", "President Roxas", "Tulunan"] },
  { province: "Sarangani", municipalities: ["Alabel", "Glan", "Kiamba", "Maasim", "Maitum", "Malapatan", "Malungon"] },
  { province: "South Cotabato", municipalities: ["Banga", "General Santos City", "Koronadal City", "Lake Sebu", "Norala", "Polomolok", "Santo Niño", "Surallah", "Tampakan", "Tantangan", "Tupi"] },
  { province: "Sultan Kudarat", municipalities: ["Bagumbayan", "Columbio", "Esperanza", "Isulan", "Kalamansig", "Lambayong", "Lebak", "Lutayan", "Palimbang", "President Quirino", "Senator Ninoy Aquino", "Tacurong City"] },
  { province: "Surigao del Norte", municipalities: ["Alegria", "Bacuag", "Burgos", "Claver", "Dapa", "Del Carmen", "General Luna", "Gigaquit", "Mainit", "Malimono", "Pilar", "Placer", "San Benito", "San Francisco", "San Isidro", "Santa Monica", "Socorro", "Surigao City", "Tagana-an", "Tubod"] },
  { province: "Surigao del Sur", municipalities: ["Barobo", "Bayabas", "Bayugan", "Bislig City", "Carrascal", "Cortes", "Hinatuan", "Lanuza", "Lianga", "Lingig", "Madrid", "Marihatag", "San Agustin", "San Miguel", "Tagbina", "Tago", "Tandag City"] },
  { province: "Zamboanga del Norte", municipalities: ["Baliguian", "Dapitan City", "Dipolog City", "Godod", "Gutalac", "Jose Dalman", "Kalawit", "Katipunan", "Labason", "La Libertad", "Liloy", "Manukan", "Mutia", "Piñan", "Polanco", "President Manuel A. Roxas", "Rizal", "Salug", "Sergio Osmeña Sr.", "Siayan", "Sibuco", "Sibutad", "Sindangan", "Siocon", "Tampilisan"] },
  { province: "Zamboanga del Sur", municipalities: ["Aurora", "Bayog", "Dimataling", "Dinas", "Dumalinao", "Dumingag", "Guipos", "Josefina", "Kumalarang", "Labangan", "Lakewood", "Lapuyan", "Mahayag", "Margosatubig", "Midsalip", "Molave", "Pagadian City", "Ramon Magsaysay", "San Miguel", "San Pablo", "Sominot", "Tabina", "Tambulig", "Tigbao", "Tukuran", "Vincenzo A. Sagun", "Zamboanga City"] },
  { province: "Zamboanga Sibugay", municipalities: ["Alicia", "Buug", "Diplahan", "Imelda", "Ipil", "Kabasalan", "Mabuhay", "Malangas", "Naga", "Olutanga", "Payao", "Roseller Lim", "Siay", "Talusan", "Titay", "Tungawan"] },
]

// A useful local directory for common checkout destinations. Other Mindanao
// municipalities still remain selectable through the province/city lists.
export const BARANGAYS_BY_MUNICIPALITY: Record<string, string[]> = {
  Mahayag: ["Bag-ong Balamban", "Boniao", "Caniangan", "Concepcion", "Gubac", "Kaangayan", "Lower Mahayag", "Malubo", "Panagaan", "Poblacion", "San Isidro", "San Jose", "San Vicente", "Tuboran", "Upper Mahayag"],
  "Pagadian City": ["Balangasan", "Baliangao", "Banale", "Bogo", "Bulatok", "Gatas", "Kawit", "Labuangan", "Lumbia", "Napolan", "Poblacion", "San Francisco", "Tigbao"],
  "Davao City": ["Agdao", "Baguio", "Buhangin", "Bunawan", "Calinan", "Marilog", "Paquibato", "Poblacion", "Talomo", "Toril", "Tugbok"],
  "Cagayan de Oro City": ["Balulang", "Bulua", "Carmen", "Consolacion", "Gusa", "Iponan", "Kauswagan", "Lapasan", "Macabalan", "Patag", "Poblacion", "Tignapoloan"],
  "General Santos City": ["Apopong", "Bula", "Calumpang", "City Heights", "Dadiangas East", "Dadiangas North", "Dadiangas South", "Dadiangas West", "Fatima", "Katangawan", "Labangal", "Lagao", "Poblacion", "San Isidro", "Sinawal"],
}

export const COMMON_BARANGAYS = ["Poblacion"]
