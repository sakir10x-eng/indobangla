export const modules = {
  toolbar: {
    container: [
      // [
      //   { header: [1, 2, 3, 4, 5, 6, false] },
      //   {
      //     font: Font.whitelist,
      //   },
      // ],
      ["bold", "italic", "underline"],
      // ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [
        { list: "ordered" },
        // { list: 'bullet' },
        // { indent: '-1' },
        // { indent: '+1' },
      ],
      // [
      //   {
      //     color: [],
      //   },
      // ],
      // [
      //   {
      //     background: [],
      //   },
      // ],
      // [{ align: [] }],
      // ['code-block'],
      // ['link', 'image', 'video'],
      // ['emoji'],
      // [{ script: 'sub' }, { script: 'super' }],
      // ['clean'],
    ],
    // handlers: {
    //   image: ImageHandler,
    // },
  },
  // 'emoji-toolbar': true,
  // 'emoji-textarea': true,
  // 'emoji-shortname': true,
};

export const formats = [
  // 'header',
  // 'font',
  "bold",
  "italic",
  "underline",
  // 'strike',
  // 'blockquote',
  "list",
  // 'bullet',
  // 'indent',
  // 'align',
  // 'link',
  // 'color',
  // 'background',
  // 'script',
  // 'code-block',
  // 'image',
  // 'video',
  // 'emoji',
];
