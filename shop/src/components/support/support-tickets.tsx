import { HttpClient } from '@/framework/client/http-client';
import { authorizationAtom } from '@/store/authorization-atom';
import { useModalAction } from '@/components/ui/modal/modal.context';
import { useAtom } from 'jotai';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import { LifeBuoy, MessageSquare, Plus, Send } from 'lucide-react';

/**
 * Customer support tickets on /help. The backend (tickets / ticket-reply) has existed for a
 * while but nothing on the storefront ever called it, so the "সাপোর্ট" links led to a FAQ page
 * with no way to actually reach a human.
 */

type Msg = { sender: 'customer' | 'admin'; message: string; at: string };
type Ticket = {
  id: number;
  subject: string;
  category: string;
  status: string;
  order?: string | null;
  created_at: string;
  last_reply_at: string;
  messages: Msg[];
};

const CATEGORIES = [
  { value: 'order', label: 'অর্ডার সংক্রান্ত' },
  { value: 'delivery', label: 'ডেলিভারি' },
  { value: 'payment', label: 'পেমেন্ট' },
  { value: 'return', label: 'রিটার্ন / রিফান্ড' },
  { value: 'book', label: 'বই সংক্রান্ত' },
  { value: 'other', label: 'অন্যান্য' },
];

const STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: 'খোলা', cls: 'bg-amber-50 text-amber-700' },
  answered: { label: 'উত্তর এসেছে', cls: 'bg-green-50 text-green-700' },
  closed: { label: 'বন্ধ', cls: 'bg-gray-100 text-gray-500' },
};

const when = (v?: string) => {
  if (!v) return '';
  const d = new Date(String(v).replace(' ', 'T'));
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
        ', ' +
        d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

/** The API answers domain errors with HTTP 200 + {errors:[{message}]}, so axios never rejects. */
const envelopeError = (r: any) => r?.errors?.[0]?.message || null;

export default function SupportTickets() {
  const [isAuthorized] = useAtom(authorizationAtom);
  const { openModal } = useModalAction();
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('order');
  const [message, setMessage] = useState('');
  const [openTicket, setOpenTicket] = useState<number | null>(null);
  const [reply, setReply] = useState('');

  const { data, isLoading } = useQuery(
    ['support-tickets'],
    () => HttpClient.get<any>('tickets'),
    { enabled: isAuthorized, staleTime: 30 * 1000 },
  );
  const tickets: Ticket[] = (data as any)?.data ?? [];

  const create = useMutation(
    (payload: any) => HttpClient.post<any>('tickets', payload),
    {
      onSuccess: (res: any) => {
        const err = envelopeError(res);
        if (err) return toast.error(err);
        toast.success('টিকেট খোলা হয়েছে — আমরা শীঘ্রই উত্তর দেব।');
        setSubject('');
        setMessage('');
        setShowForm(false);
        qc.invalidateQueries(['support-tickets']);
      },
      onError: () => toast.error('টিকেট খোলা যায়নি। আবার চেষ্টা করুন।'),
    },
  );

  const sendReply = useMutation(
    (payload: any) => HttpClient.post<any>('ticket-reply', payload),
    {
      onSuccess: (res: any) => {
        const err = envelopeError(res);
        if (err) return toast.error(err);
        setReply('');
        qc.invalidateQueries(['support-tickets']);
      },
      onError: () => toast.error('উত্তর পাঠানো যায়নি।'),
    },
  );

  if (!isAuthorized) {
    return (
      <div className="rounded-2xl border border-border-200 bg-white p-8 text-center">
        <LifeBuoy className="mx-auto mb-3 h-8 w-8 text-accent" />
        <h3 className="text-lg font-bold text-heading">সরাসরি আমাদের লিখুন</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-body">
          উত্তরে যেন আপনার অর্ডারের তথ্য থাকে, তাই টিকেট খুলতে লগইন করতে হয়।
        </p>
        <button
          onClick={() => openModal('LOGIN_VIEW')}
          className="mt-4 rounded-lg bg-accent px-6 py-2.5 text-sm font-bold text-white transition hover:bg-accent-hover"
        >
          লগইন করুন
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-heading">আমার সাপোর্ট টিকেট</h3>
          <p className="mt-0.5 text-sm text-body">
            প্রশ্ন বা সমস্যা লিখুন — উত্তর এখানেই পাবেন।
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-white transition hover:bg-accent-hover"
        >
          <Plus size={15} /> নতুন টিকেট
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!subject.trim() || !message.trim()) return;
            create.mutate({
              subject: subject.trim(),
              message: message.trim(),
              category,
            });
          }}
          className="space-y-3 rounded-2xl border border-border-200 bg-white p-5"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[12.5px] font-semibold text-body">বিষয়</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={160}
                required
                placeholder="যেমন: অর্ডার এখনো পাইনি"
                className="h-10 w-full rounded-lg border-[1.5px] border-border-200 px-3 text-sm outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12.5px] font-semibold text-body">ধরন</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 w-full cursor-pointer rounded-lg border-[1.5px] border-border-200 pl-3 pr-8 text-sm outline-none focus:border-accent"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[12.5px] font-semibold text-body">বিস্তারিত</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              required
              rows={4}
              placeholder="অর্ডার নম্বর দিলে আমরা দ্রুত খুঁজে পাব।"
              className="w-full rounded-lg border-[1.5px] border-border-200 p-3 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg px-4 py-2.5 text-sm font-semibold text-body hover:bg-gray-100"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={create.isLoading}
              className="rounded-lg bg-accent px-6 py-2.5 text-sm font-bold text-white transition hover:bg-accent-hover disabled:opacity-60"
            >
              {create.isLoading ? 'পাঠাচ্ছি…' : 'টিকেট খুলুন'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="rounded-2xl border border-border-200 bg-white p-10 text-center">
          <MessageSquare className="mx-auto mb-3 h-7 w-7 text-gray-300" />
          <p className="text-sm text-body">এখনো কোনো টিকেট নেই।</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => {
            const st = STATUS[t.status] ?? STATUS.open;
            const isOpen = openTicket === t.id;
            return (
              <div key={t.id} className="overflow-hidden rounded-2xl border border-border-200 bg-white">
                <button
                  onClick={() => setOpenTicket(isOpen ? null : t.id)}
                  className="flex w-full flex-wrap items-center gap-3 p-4 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-heading">{t.subject}</span>
                    <span className="mt-0.5 block text-xs text-body">
                      #{t.id} · {when(t.created_at)}
                      {t.order ? ` · অর্ডার ${t.order}` : ''}
                    </span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${st.cls}`}>
                    {st.label}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-border-100 bg-gray-50/60 p-4">
                    <div className="space-y-2.5">
                      {t.messages.map((m, i) => (
                        <div
                          key={i}
                          className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${
                            m.sender === 'admin'
                              ? 'bg-white text-heading ring-1 ring-border-200'
                              : 'ml-auto bg-accent text-white'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.message}</p>
                          <p
                            className={`mt-1 text-[10.5px] ${
                              m.sender === 'admin' ? 'text-gray-400' : 'text-white/70'
                            }`}
                          >
                            {m.sender === 'admin' ? 'ইন্দোবাংলা' : 'আপনি'} · {when(m.at)}
                          </p>
                        </div>
                      ))}
                    </div>

                    {t.status !== 'closed' && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!reply.trim()) return;
                          sendReply.mutate({ ticket_id: t.id, message: reply.trim() });
                        }}
                        className="mt-3 flex gap-2"
                      >
                        <input
                          value={reply}
                          onChange={(e) => setReply(e.target.value)}
                          maxLength={2000}
                          placeholder="উত্তর লিখুন…"
                          className="h-10 flex-1 rounded-lg border-[1.5px] border-border-200 px-3 text-sm outline-none focus:border-accent"
                        />
                        <button
                          type="submit"
                          disabled={sendReply.isLoading}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-bold text-white transition hover:bg-accent-hover disabled:opacity-60"
                        >
                          <Send size={14} /> পাঠান
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
