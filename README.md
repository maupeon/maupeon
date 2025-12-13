# Spotlight

Spotlight is a [Tailwind UI](https://tailwindui.com) site template built using [Tailwind CSS](https://tailwindcss.com) and [Next.js](https://nextjs.org).

## Getting started

To get started with this template, first install the npm dependencies:

```bash
npm install
```

Next, create a `.env.local` file in the root of your project and set the `NEXT_PUBLIC_SITE_URL` variable to your site's public URL:

```
NEXT_PUBLIC_SITE_URL=https://example.com
```

### Strava (Ejercicio)

This repo includes an `Ejercicio` page that can connect to Strava via OAuth and display recent activities.

1. Create a Strava app at https://www.strava.com/settings/api
2. Set these variables in `.env.local` (see `.env.example`):

```
STRAVA_CLIENT_ID=...
STRAVA_CLIENT_SECRET=...
SESSION_PASSWORD=... (>= 32 chars)
```

3. Configure your Strava app **Authorization Callback Domain** to match your domain.
	- In local dev, the callback URL is: `http://localhost:3000/api/strava/callback`
	- You can also set `STRAVA_REDIRECT_URI` if you need a fixed redirect.

Next, run the development server:

```bash
npm run dev
```

Finally, open [http://localhost:3000](http://localhost:3000) in your browser to view the website.

## Customizing

You can start editing this template by modifying the files in the `/src` folder. The site will auto-update as you edit these files.

## License

This site template is a commercial product and is licensed under the [Tailwind UI license](https://tailwindui.com/license).

## Learn more

To learn more about the technologies used in this site template, see the following resources:

- [Tailwind CSS](https://tailwindcss.com/docs) - the official Tailwind CSS documentation
- [Next.js](https://nextjs.org/docs) - the official Next.js documentation
- [Headless UI](https://headlessui.dev) - the official Headless UI documentation
- [MDX](https://mdxjs.com) - the MDX documentation
