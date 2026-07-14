const scrollToSection = ({ id, offset = -50 }: { id: string, offset?: number }) => {
  const section = document.getElementById(id);
  const yOffset = offset; // Add space below by scrolling 50px higher than the section

  if (section) {
    const yPosition =
      section.getBoundingClientRect().top + window.pageYOffset + yOffset;
    window.scrollTo({ top: yPosition - 40, behavior: 'smooth' });
  }
};

export { scrollToSection };