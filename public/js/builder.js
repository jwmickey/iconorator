;(function($) {
    var methods = {
        init : function(options) {
            return this.each(function() {
                
                // default settings
                var settings = {
                    iconWidth: 16,
                    iconHeight: 16,
                    iconSet: null,
                    perPage: 100, 
                    iconSelector: "li",
                    canvasSelector: "#iconorator-canvas",
                    cssSelector: "#iconorator-css",
                    expandSelector: "#iconorator-expand",
                    condenseSelector: "#iconorator-condense",
                    pageSelector: ".set-list",
                    srcImage: null,
                    prefix: 'icon_',
                    spriteName: 'icons',
                    selectedIcons: []
                };
                
                var loadStatus = {
                    sprite: false,
                    icons: false
                };
                
                if (options) {
                    $.extend(settings, options);
                }
                
                var plugin = this;
                var $plugin = $(this);
                $plugin.settings = settings;
                
                $plugin.find(".loading").show();

                // set some user definable configuration
                $("#prefix").val(settings.prefix);
                $("#sprite-name").val(settings.spriteName);
 
                // create icon list 
                $plugin.find("div.set-list").addClass("set-list-" + settings.iconWidth)
                                            .append($("<ul>"));

                
                // create src image
                var srcImage = new Image();
                srcImage.onload = function() {
                    loadStatus.sprite = true;
                    startIfReady();
                };
                srcImage.src = settings.srcImage;

                // keep up with things
                $plugin.data("iconorator", {
                    "icons": [],
                    "selectedIcons": [],
                    "pages": 0,
                    "curPage": 0,
                    "perPage": settings.perPage,
                    "numIcons": 0,
                    "srcImage": srcImage,
                    "canvas": $(settings.canvasSelector)[0],
                    "htmlTemplate": $("#download-html pre").html()
                });
                
                $(settings.canvasSelector).hide();
                
                // load icon information
                $.getJSON(settings.iconSet, function(json) {
                    data = $plugin.data("iconorator");
                    data.icons = json.icons;
                    data.pages = Math.ceil(json.icons.length / data.perPage);
                    
                    loadStatus.icons = true;
                    startIfReady();
                });
                
                function startIfReady() {
                    if (loadStatus.icons && loadStatus.sprite) {
                        $plugin.find("div.loading").fadeOut();
                        
                        var data = $plugin.data("iconorator");
                        
                        loadSelectedIcons();
                        
                        plugin.updatePageNum(data.curPage);
                        plugin.loadPage(0, data.perPage);
                    }
                };
                
                // come back to this, it only works for the first page 
                // since we load icons one page at a time
                function loadSelectedIcons() {
                    var data = $plugin.data("iconorator");
                    
                    for (i in $plugin.settings.selectedIcons) {
                        var result = $.grep(data.icons, function(e) {
                            return e.name == $plugin.settings.selectedIcons[i];
                        });
                        
                        if (!result.length) continue;
                        
                        var icon = result[0];
                        var preview = $("<i>").addClass(icon.rule);
                        
                        plugin.addIcon(icon.name, preview, Math.abs(icon.x), Math.abs(icon.y));
                    }
                };
                
                // bind prev/next page buttons
                $plugin.find(".page-next").on("click", function(e) {
                    e.preventDefault();
                    plugin.nextPage();
                });
                $plugin.find(".page-prev").on("click", function(e) {
                    e.preventDefault();
                    plugin.prevPage();
                });
                $plugin.find(".page-number").on("click", function(e) {
                    e.preventDefault();
                });
                    
                $("#iconorator-build").on("click", function(e) {
                    e.preventDefault();
                    plugin.redraw();
                    
                    var iconNames = [];
                    var selected = $plugin.data("iconorator").selectedIcons;
                    for (i in selected) {
                        iconNames.push(selected[i].name);
                    }
                    
                    $.post('/save', {
                        set: $plugin.settings.setName,
                        icons: iconNames.join(','),
                        settings: {
                            prefix: $("#prefix").val(),
                            spriteName: $("#sprite-name").val()
                        }
                    }, function(json) {
                        if (json.success) {
                            var curCss = $("#download-css pre").html();
                            $("#download-css pre").html('/* ' + json.downloadUrl + ' */' + '\n' + curCss);
                        }
                    }, 'json');
                    
                    $("#download-img img").attr("src", $plugin.data("iconorator").canvas.toDataURL());
                    prettyPrint();
                });
                    
                // bind toggle from condensed to expanded view
                $(settings.expandSelector).on("click.iconorator", function() {
                    $plugin.removeClass("condensed").addClass("expanded");
                    $plugin.css("margin-bottom", $("#build-info").css("height"));
                });
                $(settings.condenseSelector).on("click.iconorator", function() {
                    $plugin.removeClass("expanded").addClass("condensed");
                    $plugin.css("margin-bottom", $("#build-info").css("height"));
                });
            
                this.nextPage = function() {
                    var data = $plugin.data("iconorator");
                    data.curPage++;
                    if (data.curPage >= data.pages) {
                        data.curPage = 0;
                    }
                    
                    var offset = data.curPage * data.perPage;
                    plugin.loadPage(offset, data.perPage);
                    plugin.updatePageNum(data.curPage);
                };
                
                this.prevPage = function() {
                    var data = $plugin.data("iconorator");
                    data.curPage--;
                    if (data.curPage < 0) {
                        data.curPage = data.pages - 1;
                    }
                    
                    var offset = data.curPage * data.perPage;
                    plugin.loadPage(offset, data.perPage);
                    plugin.updatePageNum(data.curPage);
                };
                
                this.updatePageNum = function(internalPage) {
                    var numPages = $plugin.data("iconorator").pages;
                    var visualPageNum = internalPage + 1;
                    $plugin.find(".page-number a").html(visualPageNum + " of " + numPages);
                };
                
                // load a page of icons
                this.loadPage = function(offset, num) {
                    var data = $plugin.data("iconorator");
                    
                    var iconUl = $plugin.find("div.set-list ul");
                    var page = data.icons.slice(offset, num + offset);
                    iconUl.empty();

                    $.each(page, function(index, icon) {
                        var li = $("<li>").attr("data-icon", icon.name)
                                      .attr("data-x", icon.x)
                                      .attr("data-y", icon.y)
                                      .attr("id", "icon-" + icon.name)
                                      .attr("title", icon.name)
                                      .addClass("btn");
                                      
                        var result = $.grep(data.selectedIcons, function(e) {
                            return e && e.name == icon.name;
                        });
                        
                        if (result.length) {
                            li.addClass("btn-inverse");
                        }
                        
                        li.append($("<i>").addClass(icon.rule));
                        li.append($("<span>").html(icon.name));
                        li.tooltip({animation: false})
                          .on("click.iconorator", function() {
                            name = $(this).attr("data-icon");
                            preview = $(this).children("i").clone().empty();
                            x = Math.abs($(this).attr("data-x"));
                            y = Math.abs($(this).attr("data-y"));

                            var result = $.grep(data.selectedIcons, function(e) {
                                if (!e) return false;
                                return e.name == icon.name;
                            });
                            if (result.length) {
                                plugin.removeIcon(name, preview);
                                $(this).removeClass("btn-inverse");
                            } else {
                                plugin.addIcon(name, preview, x, y);
                                $(this).addClass("btn-inverse");
                            }
                        });
                        iconUl.append(li);
                    });
                };
                
                // get selected icons
                this.getIcons = function() {
                    var keys = [];
                    for (var key in $plugin.data("iconorator").selectedIcons) {
                        keys.push(key);
                    }
                    return keys;
                };

                // add icon
                this.addIcon = function(name, preview, x, y) {
                    var data = $plugin.data("iconorator");
                    data.selectedIcons.push({ name: name, srcX: x, srcY: y });
                    data.numIcons++;
                    
                    $(".build-last-action").html('<i class="icon-plus"></i> Added ' + name)
                                           .addClass("label-success")
                                           .removeClass("label-important");
                    $(".build-preview").html(preview);
                };
                
                // remove icon
                this.removeIcon = function(name, preview) {
                    var data = $plugin.data("iconorator");
                    id = null;
                    var result = $.grep(data.selectedIcons, function(e, i) {
                        if (!e) return false;
                        if (e.name == name) {
                            id = i;
                            return true;
                        }
                        return false;
                    });
                    if (!result.length) return;
                    
                    delete data.selectedIcons[id];
                    data.numIcons--;
                    
                    $(".build-last-action").html('<i class="icon-minus"></i> Removed ' + name)
                                           .addClass("label-important")
                                           .removeClass("label-success");
                    $(".build-preview").html(preview);
                };
                
                // draw the canvas
                this.redraw = function() {
                    var data = $plugin.data("iconorator");
                    
                    var canvas = $($plugin.settings.canvasSelector);
                    var ctx = data.canvas.getContext("2d");
                    var width = $plugin.settings.iconWidth;
                    var height = $plugin.settings.iconHeight;
                    var posX = 0;
                    var posY = 0;
                    
                    // Store the current transformation matrix
                    ctx.save();

                    // Use the identity matrix while clearing the canvas
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.clearRect(0, 0, canvas.width(), canvas.height());

                    // Restore the transform
                    ctx.restore();
                    
                    var canvasHeight = Math.max(Math.ceil(data.numIcons / (canvas.width() / width)) * height, 1);
                    canvas[0].height = canvasHeight;
                    
                    $("#download-img-name").html($("#sprite-name").val() + ".png");
                    $("#download-css pre").html(
                        "[class^=\"" + $("#prefix").val() + "\"], [class*=\" " + $("#prefix").val() + "\"]" + " {\n" + 
                        "\tdisplay: inline-block;\n" + 
                        "\twidth: " + $plugin.settings.iconWidth + "px;\n" + 
                        "\theight: " + $plugin.settings.iconHeight + "px;\n" +
                        "\tline-height: " + $plugin.settings.iconHeight + "px;\n" + 
                        "\tvertical-align: text-top;\n" +  
                        "\tbackground-image: url(" + $("#sprite-name").val() + ".png);\n" + 
                        "\tbackground-repeat: no-repeat;\n" + 
                        "\tmargin-top: 1px;\n" + 
                        "}\n"
                    );
                        
                    $("#download-html pre").empty();
                    
                    var prefix = $("#prefix").val();
                    var lis = "";
                    
                    for (i in data.selectedIcons) {
                        icon = data.selectedIcons[i];
                        
                        if (posX >= canvas.width()) {
                            posX = 0;
                            posY += height;
                        }
                        ctx.drawImage(data.srcImage, icon.srcX, icon.srcY, width, height, posX, posY, width, height);
                        
                        var cssPosX = posX * -1;
                        var cssPosY = posY * -1;
                        
                        posX += width;
                        
                        $("#download-css pre").append("." + prefix + icon.name + " { background-position: " + cssPosX + "px " + cssPosY + "px }\n");
                        lis = lis + "\n            &lt;li&gt;&lt;i class=\"" + prefix + icon.name + "\"&gt;&lt;/i&gt; " + prefix + icon.name + "&lt;/li&gt;";
                    }
                    
                    var newhtml = data.htmlTemplate.replace("::HTML::", "&lt;ul&gt;" + lis + "\n        &lt;/ul&gt;");
                    $("#download-html pre").html(newhtml);
                };
            });
        },

        // this is not a great search, but i have faith in your awesome computer
        search : function(term) {
            if (!term.length) {
                return;
            }

            var data = $(this).data("iconorator");
            var allIcons = data.icons;
            var matches = [];

            for (var i in allIcons) {
                if (allIcons[i].name.indexOf(term) != -1) {
                    matches.push(allIcons[i]);
                }
            }

            data.tmp = data.icons;
            data.icons = matches;
        },

        reset: function() {
            var data = $(this).data("iconorator");

            if (!data.tmp) {
                $(this).init();
            } else {
                data.icons = data.tmp;
                data.tmp = null;
            }
        }
    };

    $.fn.iconorator = function(method) {
        if(methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if(typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error("Method " +  method + " does not exist on jQuery.iconorator");
        }    
    };

})(jQuery);
