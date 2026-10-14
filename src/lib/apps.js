// Apps published on my App Store developer account (Mauricio Peon, artist id
// 1779584452), newest first. Descriptions live in translations under
// `apps.items.<key>`. Icons are Apple's own artwork CDN, so they stay in sync
// with the store listing.
const icon = (path) => `https://is1-ssl.mzstatic.com/image/thumb/${path}/256x256bb.jpg`

export const appStoreApps = [
  {
    key: 'pasadosDeYarda',
    name: 'Pasados de Yarda',
    id: '6814891399',
    year: 2026,
    icon: icon('Purple211/v4/29/5d/80/295d802b-6db9-ee0e-739e-6fd50667e652/PasadosDeYarda-0-0-1x_U007ephone-0-1-sRGB-85-220.png'),
  },
  {
    key: 'ubermensch',
    name: 'Ubermensch',
    id: '6797676490',
    year: 2026,
    icon: icon('Purple211/v4/d1/da/ee/d1daee5d-18d7-8f9b-ed8c-be7161af7e68/AppIcon-0-0-1x_U007ephone-0-1-85-220.png'),
  },
  {
    key: 'cuno',
    name: 'Cuño',
    id: '6774363925',
    year: 2026,
    icon: icon('Purple211/v4/7c/c2/d5/7cc2d558-09a9-fd17-04ec-6c67c0ea5e40/icon-0-0-1x_U007ephone-0-1-sRGB-85-220.png'),
  },
  {
    key: 'guardia',
    name: 'Guardia',
    id: '6759487211',
    year: 2026,
    icon: icon('Purple221/v4/25/7c/45/257c45ac-f4be-c45b-68c7-bc9f1a6caa3c/icon-0-0-1x_U007ephone-0-1-85-220.png'),
  },
  {
    key: 'teToco',
    name: '¿Te tocó?',
    id: '6756806727',
    year: 2025,
    icon: icon('Purple211/v4/80/60/81/80608162-ff06-2663-b9d1-c964e402dd4e/AppIcon-0-0-1x_U007epad-0-1-85-220.png'),
  },
  {
    key: 'tapmap',
    name: 'Tapmap',
    id: '6738144322',
    year: 2024,
    icon: icon('Purple221/v4/64/d7/3f/64d73f99-1b3f-59bd-fa6e-975d98813dc0/AppIcon-0-0-1x_U007emarketing-0-8-0-85-220.png'),
  },
]

export const appStoreUrl = (app) => `https://apps.apple.com/app/id${app.id}`
