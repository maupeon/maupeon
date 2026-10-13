import logoMedu from '@/images/logos/medu.png'
import logoIBM from '@/images/logos/ibm.jpeg'

// Language-neutral facts from the CV (public/documents/CV.pdf). Anything that
// needs translating (role titles, degrees, bullets…) lives in the `profile.*`,
// `home.*` and `about.*` keys of src/lib/translations/*.json.
export const profile = {
  name: 'Mauricio Peón García',
  email: 'yo@maupeon.com',
  url: 'https://www.maupeon.com',
  cv: '/documents/CV.pdf',
  links: {
    linkedin: 'https://www.linkedin.com/in/mauricio-peon',
    github: 'https://github.com/maupeon',
  },
  jobs: [
    {
      key: 'medu',
      company: 'Medu',
      logo: logoMedu,
      start: { label: '2019', dateTime: '2019' },
      end: null,
    },
    {
      key: 'ibm',
      company: 'IBM',
      logo: logoIBM,
      start: { label: 'Jun 2019', dateTime: '2019-06' },
      end: { label: 'Jun 2020', dateTime: '2020-06' },
    },
  ],
  education: [
    {
      key: 'ucm',
      school: 'Universidad Complutense de Madrid',
      start: { label: '2025', dateTime: '2025' },
      end: { label: '2026', dateTime: '2026' },
    },
    {
      key: 'itesm',
      school: 'Tecnológico de Monterrey (ITESM)',
      start: { label: '2016', dateTime: '2016' },
      end: { label: '2020', dateTime: '2020' },
    },
  ],
}
