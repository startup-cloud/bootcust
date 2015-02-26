module.exports =  {
    dependencies: [
        {file: './public/lib/bootstrap/dist/css/bootstrap.css'}
    ],

    generated_src: [
        {dir: './public/css_from_less/*.css'}
    ],

    src: [
        { dir: './public/css/*.css' },
        { dir: './public/css_from_less/*.css' }
    ]


}