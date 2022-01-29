#!/bin/bash

# defaults
width=16;
package="icons";
className="icon";
outputDir=".";

# get arguments
while getopts ":s:p:o:w:c:" opt; do
    case $opt in 
        s) 
            sourceDir=$OPTARG;
            ;;
        p)
            package=$OPTARG;
            ;;
        o) 
            outputDir=$OPTARG;
            ;;
        w) 
            width=$OPTARG;
            ;;
        c) 
            className=$OPTARG;
            ;;
    esac
done

# require path to icon set
if [ ! -d "$sourceDir" ]; then
    echo "Error: $sourceDir is not a directory";
    exit 0;
fi

pngOut=$outputDir/sprite.png;
cssOut=$outputDir/sprite.css;
htmlOut=$outputDir/demo.html;
defOut=$outputDir/definition.json;

# tell what we are doing
echo "Building $package from $sourceDir";
cols=$((800 / $width));

# generate the image

echo "Generating image sprite";
montage $sourceDir/*.png -background none -tile ${cols}x -geometry '1x1+0+0<' PNG32:$pngOut

# generate the css and html preview
echo "Generating CSS and HTML preview";

# css
echo "/* $package icon set */" > $cssOut
echo ".$className { " >> $cssOut
echo "    display: inline-block;" >> $cssOut
echo "    width: ${width}px;" >> $cssOut
echo "    height: ${width}px;" >> $cssOut
echo "    background: transparent url(sprite.png) 0 0 no-repeat;" >> $cssOut
echo "}" >> $cssOut

# html
padding=$(($width + 2));
echo "<!-- $package icon set -->" > $htmlOut
echo "<html><head>" >> $htmlOut
echo "<link type=\"text/css\" href=\"$package.css\" rel=\"stylesheet\" />" >> $htmlOut
echo "<style type=\"text/css\">" >> $htmlOut
echo "span { font-size: 10px; font-family: system, sans-serif; margin:2px;border:1px solid #999;line-height: ${padding}px; width: 200px; float: left;}" >> $htmlOut
echo "span i { margin: 2px; }" >> $htmlOut
echo "</style></head><body>" >> $htmlOut

# definition (json)
echo "{\"icons\":[" > $defOut

col=0;
row=0;
for f in $sourceDir/*.png; do
    filename=$(basename $f);
    noext=${filename%.*};

    if [ $col -ge $cols ] ; then
        col=0;
        row=$(($row + 1));
    fi

    posX=$(($col * $width * -1));
    posY=$(($row * $width * -1));

    # append css
    echo ".${className}_${noext} { background-position: ${posX}px ${posY}px; }" >> $cssOut

    col=$(($col + 1));

    # append html
    echo "<span><i class=\"${className} ${className}_${noext}\"></i>${noext}</span>" >> $htmlOut

    # append definition
    echo "{ \"name\": \"${noext}\", \"rule\": \"${className} ${className}_${noext}\", \"x\": ${posX}, \"y\": ${posY} }," >> $defOut
done

echo "</body></html>" >> $htmlOut

echo "]}" >> $defOut

echo "Done!";
