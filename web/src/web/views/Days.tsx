import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { longDay, shortDate } from "../../shared/format";
import { Markdown } from "../../shared/markdown";
import { api } from "../api";
import { href } from "../router";

export function Days({ date }: { date: string | null }) {
   const days = useInfiniteQuery({
      queryKey: ["days"],
      queryFn: ({ pageParam }) => api.days(pageParam),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (page) => (page.length < 30 ? undefined : page[page.length - 1].date),
   });
   const list = days.data?.pages.flat() ?? [];
   const selected = date ?? list[0]?.date ?? null;

   return (
      <div className="days">
         <nav className="day-list" aria-label="Days">
            {list.map((day) => (
               <a
                  key={day.date}
                  href={href.days(day.date)}
                  aria-current={day.date === selected ? "page" : undefined}
               >
                  <span>{shortDate(day.date)}</span>
                  <span className="muted small">
                     {new Intl.DateTimeFormat("en-GB", {
                        weekday: "short",
                        timeZone: "UTC",
                     }).format(new Date(`${day.date}T00:00:00Z`))}
                  </span>
                  {!day.isSignedOff && <span className="badge wait">open</span>}
               </a>
            ))}
            {days.hasNextPage && (
               <button onClick={() => void days.fetchNextPage()} disabled={days.isFetchingNextPage}>
                  Earlier days
               </button>
            )}
         </nav>
         {selected ? <DayDetail date={selected} /> : <p className="muted">No days recorded yet.</p>}
      </div>
   );
}

function DayDetail({ date }: { date: string }) {
   const view = useQuery({ queryKey: ["day", date], queryFn: () => api.day(date) });
   if (view.isPending) return <p className="muted">Loading {shortDate(date)}…</p>;
   if (view.isError) return <p className="muted">{view.error.message}</p>;
   const { day } = view.data;

   return (
      <article className="day">
         <h1>{longDay(day.date)}</h1>
         <p className="muted">
            {day.isSignedOff && day.signedOffAt
               ? `Signed off ${shortDate(day.signedOffAt)}.`
               : "Not signed off. The Summary is written when the night routine closes the day."}
         </p>
         <section>
            <h2>Summary</h2>
            {day.summary ? (
               <Markdown text={day.summary} />
            ) : (
               <p className="muted">No Summary yet.</p>
            )}
         </section>
         <section>
            <h2>Notes</h2>
            {day.notes.length === 0 && <p className="muted">No notes for this day.</p>}
            {day.notes.map((note) => (
               <Markdown key={note.id} text={note.body} className="note" />
            ))}
         </section>
      </article>
   );
}
