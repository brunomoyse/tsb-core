const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const output = "/Users/brunomoyse/Development/applications/PERSO/tsb/tsb-core/public/images/compressed/";
const input = "/Users/brunomoyse/Development/applications/PERSO/tsb/tsb-core/public/images/menu/sushi/";
const pngQuality = { quality: 80 };
const webpQuality = { quality: 80, reductionEffort: 6 };
const avifQuality = { quality: 80, speed: 1 };
const sizes = [360];
fs.readdir(input, (err, files) => {
    console.log(files);
    console.log("Found " + files.length + " files. Converting now, please be patient..");
    files.forEach((file) => {
        function convert(size) {
            let fileShort = path.parse(file).name;
            sharp(input + file)
                .png(pngQuality)
                .resize({ width: size })
                .toFile(output + fileShort + "-" + size + ".png");
            sharp(input + file)
                .webp(webpQuality)
                .resize({ width: size })
                .toFile(output + fileShort + "-" + size + ".webp");
            sharp(input + file)
                .avif(avifQuality)
                .resize({ width: size })
                .toFile(output + fileShort + "-" + size + ".avif");
        }
        if (file.endsWith(".png") || file.endsWith(".jpg") || file.endsWith(".jpeg")) {
            for (let i = 0; i < sizes.length; i++) {
                convert(sizes[i]);
            }
        }
    });
});
