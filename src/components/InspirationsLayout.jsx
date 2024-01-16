import React from 'react'

export default function InspirationsLayout({ files, title }) {
  return (
    <>
      <h1 className="my-10 text-2xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100 sm:text-3xl">
        {title}
      </h1>
      <ul
        role="list"
        className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 xl:gap-x-8"
      >
        {files.map((file) => (
          <li key={file.title} className="relative">
            <div
              className={` group block ${
                title === 'Canciones' ? 'aspect-square' : 'aspect-[7/10]'
              }  w-full overflow-hidden rounded-lg bg-gray-100  `}
            >
              <img
                src={file.source.src}
                alt=""
                className="pointer-events-none object-cover group-hover:opacity-75"
              />
              <button
                type="button"
                className="absolute inset-0 focus:outline-none"
              >
                <span className="sr-only">View details for {file.title}</span>
              </button>
            </div>
            <p className="pointer-events-none mt-2 block truncate text-sm font-medium text-gray-200">
              {file.title}
            </p>
            <p className="pointer-events-none block text-sm font-medium text-gray-400">
              {file.size}
            </p>
          </li>
        ))}
      </ul>
    </>
  )
}
