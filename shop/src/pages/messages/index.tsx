import Seo from '@/components/seo/seo';
import { getLayout as getSiteLayout } from '@/components/layouts/layout';
import DashboardSidebar from '@/components/dashboard/sidebar';
import { HttpClient } from '@/framework/client/http-client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import Button from '@/components/ui/button';

export { getStaticProps } from '@/framework/general.ssr';

function list(res: any): any[] {
  if (Array.isArray(res)) return res;
  return res?.data ?? res?.conversations ?? [];
}

function MessagesPage() {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [text, setText] = useState('');

  const { data: convRes, isLoading } = useQuery(['conversations'], () =>
    HttpClient.get<any>('conversations', { limit: 30 })
  );
  const conversations = list(convRes);

  const { data: msgRes } = useQuery(
    ['messages', activeId],
    () => HttpClient.get<any>(`messages/conversations/${activeId}`, { limit: 50 }),
    { enabled: !!activeId }
  );
  const messages = list(msgRes);

  const { mutate: send, isLoading: sending } = useMutation(
    (body: string) =>
      HttpClient.post<any>(`messages/conversations/${activeId}`, { message: body }),
    {
      onSuccess: () => {
        setText('');
        queryClient.invalidateQueries(['messages', activeId]);
      },
    }
  );

  return (
    <div className="flex w-full flex-col rounded bg-light shadow-sm lg:h-[70vh] lg:flex-row">
      <Seo title="Messages" url="messages" />
      {/* conversation list */}
      <aside className="w-full border-border-200 lg:w-72 lg:border-r rtl:lg:border-l">
        <h2 className="border-b border-border-200 p-4 text-base font-semibold text-heading">
          Messages
        </h2>
        {isLoading ? (
          <p className="p-4 text-sm text-body">Loading…</p>
        ) : conversations.length === 0 ? (
          <p className="p-4 text-sm text-body">
            No conversations yet. Open any shop and tap “Message shop” to start
            chatting with the seller.
          </p>
        ) : (
          <ul>
            {conversations.map((c: any) => (
              <li key={c.id}>
                <button
                  onClick={() => setActiveId(c.id)}
                  className={`w-full border-b border-border-100 px-4 py-3 text-left text-sm ${
                    activeId === c.id ? 'bg-gray-100 font-semibold' : ''
                  }`}
                >
                  {c?.shop?.name || c?.user?.name || `Conversation #${c.id}`}
                  {c?.unseen ? (
                    <span className="ms-2 rounded-full bg-accent px-2 text-[10px] text-white">
                      new
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* thread */}
      <section className="flex flex-1 flex-col">
        {!activeId ? (
          <div className="flex flex-1 items-center justify-center p-8 text-sm text-body">
            Select a conversation to view messages.
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <p className="text-sm text-body">No messages yet — say hello 👋</p>
              ) : (
                messages
                  .slice()
                  .reverse()
                  .map((m: any) => (
                    <div
                      key={m.id}
                      className={`max-w-[75%] rounded-lg px-4 py-2 text-sm ${
                        m?.user_id && m?.conversation?.user_id === m?.user_id
                          ? 'ms-auto bg-accent text-white'
                          : 'bg-gray-100 text-heading'
                      }`}
                    >
                      {m?.body || m?.message}
                    </div>
                  ))
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (text.trim()) send(text.trim());
              }}
              className="flex items-center gap-2 border-t border-border-200 p-3"
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message…"
                className="flex-1 rounded border border-border-base px-4 py-2 text-sm focus:border-accent focus:outline-none"
              />
              <Button loading={sending} disabled={sending || !text.trim()}>
                Send
              </Button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

const getLayout = (page: React.ReactElement) =>
  getSiteLayout(
    <div className="flex flex-col items-start w-full px-5 py-10 mx-auto max-w-1920 bg-light lg:bg-gray-100 xl:flex-row xl:py-14 xl:px-8 2xl:px-14">
      <DashboardSidebar className="hidden shrink-0 ltr:mr-8 rtl:ml-8 xl:block xl:w-80" />
      {page}
    </div>
  );

MessagesPage.getLayout = getLayout;

export default MessagesPage;
