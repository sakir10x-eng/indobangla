import { Link, Element } from 'react-scroll';
import Seo from '@/components/seo/seo';

export interface PolicySection {
  id: string;
  title: string;
  description: string;
}

export interface PolicyDocument {
  title: string;
  date: string;
  content: PolicySection[];
}

// Anchors are keyed off the section id, not the heading: the headings are in Bengali, and
// slugifying those to [a-z0-9] collapses every one of them to the same empty string.
function sectionAnchor(id: string) {
  return `section_${id}`;
}

/**
 * Shared long-form legal page: sticky scroll-spy index on the left, sections on the right.
 * Content is plain HTML rather than i18n keys — these documents are maintained as a whole,
 * not phrase by phrase.
 */
export default function PolicyPage({
  document,
  seoTitle,
  seoUrl,
}: {
  document: PolicyDocument;
  seoTitle: string;
  seoUrl: string;
}) {
  const { title, date, content } = document;

  return (
    <>
      <Seo title={seoTitle} url={seoUrl} />
      <section className="mx-auto w-full max-w-1920 bg-light px-4 py-8 lg:py-10 lg:px-8 xl:py-14 xl:px-16 2xl:px-20">
        <header className="mb-10 sm:mt-2 lg:mb-14 xl:mt-4">
          <h1 className="mb-4 text-xl font-bold text-heading sm:mb-5 sm:text-3xl md:text-2xl 2xl:mb-7 2xl:text-4xl">
            {title}
          </h1>
          <p className="px-0.5 text-sm text-body-dark md:text-base 2xl:text-lg">
            সর্বশেষ হালনাগাদ: {date}
          </p>
        </header>

        <div className="flex flex-col md:flex-row">
          <nav className="mb-8 md:mb-0 md:w-72 xl:w-3/12">
            <ol className="sticky z-10 md:top-16 lg:top-22">
              {content?.map((item) => (
                <li key={item.id}>
                  <Link
                    spy={true}
                    offset={-120}
                    smooth={true}
                    duration={500}
                    to={sectionAnchor(item.id)}
                    activeClass="text-sm lg:text-base text-heading font-semibold"
                    className="inline-flex cursor-pointer py-3 text-sub-heading"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ol>
          </nav>

          <div className="md:w-9/12 md:pb-10 ltr:md:pl-8 rtl:md:pr-8">
            {content?.map((item) => (
              <Element
                key={item.id}
                name={sectionAnchor(item.id)}
                className="mb-10"
              >
                <h2 className="mb-4 text-lg font-bold text-heading md:text-xl lg:text-2xl">
                  {item.title}
                </h2>
                <div
                  className="policy-body leading-loose text-body-dark"
                  dangerouslySetInnerHTML={{ __html: item.description }}
                />
              </Element>
            ))}
          </div>
        </div>
      </section>

      <style jsx global>{`
        .policy-body p {
          margin-bottom: 1rem;
        }
        .policy-body ul {
          list-style: disc;
          padding-left: 1.25rem;
          margin-bottom: 1rem;
        }
        .policy-body li {
          margin-bottom: 0.375rem;
        }
        .policy-body a {
          color: #e63946;
          text-decoration: underline;
        }
      `}</style>
    </>
  );
}
