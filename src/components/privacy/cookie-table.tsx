import { cookies } from "@/data/privacy";

/** The cookie list: a table from tablet width up, stacked cards on phones so nothing scrolls sideways. */
export function CookieTable() {
  return (
    <>
      <ul className="space-y-3 md:hidden" aria-label="Cookies and storage used by this website">
        {cookies.map((cookie) => (
          <li key={cookie.name} className="rounded-lg border p-4">
            <p className="font-semibold text-foreground">{cookie.name}</p>
            <p className="mt-1 text-sm">{cookie.purpose}</p>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="font-medium text-foreground">Provider</dt>
              <dd>{cookie.provider}</dd>
              <dt className="font-medium text-foreground">Duration</dt>
              <dd>{cookie.duration}</dd>
              <dt className="font-medium text-foreground">Type</dt>
              <dd>{cookie.type}</dd>
            </dl>
          </li>
        ))}
      </ul>

      <div className="hidden md:block">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">Cookies and storage used by this website</caption>
          <thead>
            <tr className="border-b text-foreground">
              <th scope="col" className="py-3 pr-4 font-semibold">Name</th>
              <th scope="col" className="py-3 pr-4 font-semibold">Provider</th>
              <th scope="col" className="py-3 pr-4 font-semibold">Purpose</th>
              <th scope="col" className="py-3 pr-4 font-semibold">Duration</th>
              <th scope="col" className="py-3 font-semibold">Type</th>
            </tr>
          </thead>
          <tbody>
            {cookies.map((cookie) => (
              <tr key={cookie.name} className="border-b align-top">
                <th scope="row" className="py-3 pr-4 font-medium text-foreground">
                  {cookie.name}
                </th>
                <td className="py-3 pr-4">{cookie.provider}</td>
                <td className="py-3 pr-4">{cookie.purpose}</td>
                <td className="py-3 pr-4">{cookie.duration}</td>
                <td className="py-3">{cookie.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
