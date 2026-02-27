/*
* Template Name: Unique - Responsive vCard Template
* Author: lmpixels
* Author URL: http://themeforest.net/user/lmpixels
* Version: 2.1.0
*/

(function($) {
"use strict";
    
    // Portfolio subpage filters
    function portfolio_init() {
        var portfolio_grid = $('#portfolio_grid'),
            portfolio_filter = $('#portfolio_filters');
            
        if (portfolio_grid) {

            portfolio_grid.shuffle({
                speed: 450,
                itemSelector: 'figure'
            });

            $('.site-main-menu').on("click", "a", function (e) {
                portfolio_grid.shuffle('update');
            });


            portfolio_filter.on("click", ".filter", function (e) {
                portfolio_grid.shuffle('update');
                e.preventDefault();
                $('#portfolio_filters .filter').parent().removeClass('active');
                $(this).parent().addClass('active');
                portfolio_grid.shuffle('shuffle', $(this).attr('data-group') );
            });

        }
    }
    // /Portfolio subpage filters

    function normalizeUrl(url) {
        if (!url) {
            return '';
        }

        var trimmedUrl = $.trim(url);
        if (!trimmedUrl) {
            return '';
        }

        if (/^https?:\/\//i.test(trimmedUrl)) {
            return trimmedUrl;
        }

        return 'https://' + trimmedUrl.replace(/^\/+/, '');
    }

    function normalizeRepoKey(name) {
        return (name || '').toLowerCase().replace(/[\s_-]+/g, '');
    }

    function formatRepoTitle(name) {
        return (name || '')
            .split(/[_-]+/)
            .filter(function(part) { return !!part; })
            .map(function(part) {
                var lower = part.toLowerCase();
                return lower.charAt(0).toUpperCase() + lower.slice(1);
            })
            .join(' ');
    }

    function getPublishedRepoUrl(repo) {
        var repoKey = normalizeRepoKey(repo.name);

        if (repoKey.indexOf('trillo') !== -1 || repoKey.indexOf('treillo') !== -1) {
            return 'https://monotask.diteria.net';
        }

        if (
            repoKey.indexOf('silicontraveler') !== -1 ||
            (repoKey.indexOf('silicon') !== -1 && repoKey.indexOf('traveler') !== -1)
        ) {
            return 'https://silicontraveler.diteria.net';
        }

        if (repoKey.indexOf('diteriahome') !== -1 || repoKey.indexOf('diteria') !== -1) {
            return 'https://diteria.net';
        }

        var homepageUrl = normalizeUrl(repo.homepage);
        if (homepageUrl) {
            return homepageUrl;
        }

        if (!repo.has_pages || !repo.owner || !repo.owner.login) {
            return '';
        }

        if (repo.name.toLowerCase() === (repo.owner.login + '.github.io').toLowerCase()) {
            return 'https://' + repo.owner.login + '.github.io/';
        }

        return 'https://' + repo.owner.login + '.github.io/' + repo.name + '/';
    }

    function buildRepoCard(repo) {
        var publishedUrl = getPublishedRepoUrl(repo);
        var description = repo.description || 'No description available.';
        var language = repo.language || 'N/A';
        var displayName = formatRepoTitle(repo.name);

        var $col = $('<div>', {
            'class': 'col-sm-6 col-md-4 subpage-block'
        });
        var $card = $('<article>', {
            'class': 'repo-card'
        });
        var $title = $('<h3>', {
            'class': 'repo-card-title'
        });
        var $repoLink = $('<a>', {
            href: repo.html_url,
            target: '_blank',
            rel: 'noopener noreferrer',
            text: displayName
        });

        $title.append($repoLink);

        if (publishedUrl) {
            var $webLink = $('<a>', {
                href: publishedUrl,
                target: '_blank',
                rel: 'noopener noreferrer',
                'class': 'repo-web-link',
                title: 'Open published website',
                'aria-label': 'Open published website for ' + repo.name
            });
            $webLink.append($('<i>', { 'class': 'fa fa-globe' }));
            $title.append($webLink);
        }

        $card.append($title);
        $card.append($('<p>', {
            'class': 'repo-card-description',
            text: description
        }));
        $card.append($('<p>', {
            'class': 'repo-card-meta',
            text: language
        }));

        return $col.append($card);
    }

    function getCachedRepos(cacheKey, maxAgeMs) {
        try {
            var cachedValue = localStorage.getItem(cacheKey);
            if (!cachedValue) {
                return null;
            }

            var parsed = JSON.parse(cachedValue);
            if (!parsed || !parsed.savedAt || !Array.isArray(parsed.repos)) {
                return null;
            }

            if ((Date.now() - parsed.savedAt) > maxAgeMs) {
                return null;
            }

            return parsed.repos;
        } catch (error) {
            return null;
        }
    }

    function setCachedRepos(cacheKey, repos) {
        try {
            localStorage.setItem(cacheKey, JSON.stringify({
                savedAt: Date.now(),
                repos: repos
            }));
        } catch (error) {
            // Ignore localStorage errors (private mode/quota/security).
        }
    }

    function initGithubRepos() {
        var githubUser = 'p-carrillo';
        var apiUrl = 'https://api.github.com/users/' + githubUser + '/repos?per_page=100&sort=updated&direction=desc';
        var cacheKey = 'github_repos_' + githubUser;
        var cacheTtlMs = 5 * 60 * 1000;
        var $reposList = $('#repos-list');
        var $reposStatus = $('#repos-status');

        if (!$reposList.length || !$reposStatus.length) {
            return;
        }

        function renderRepos(repos, fromCache) {
            var publicRepos = Array.isArray(repos) ? repos
                .filter(function(repo) {
                    return repo && !repo.private;
                })
                .sort(function(a, b) {
                    var aDate = new Date(a.pushed_at || a.updated_at || 0).getTime();
                    var bDate = new Date(b.pushed_at || b.updated_at || 0).getTime();
                    return bDate - aDate;
                }) : [];

            $reposList.empty();

            if (!publicRepos.length) {
                $reposStatus.text('No public repositories to display.');
                return;
            }

            publicRepos.forEach(function(repo) {
                $reposList.append(buildRepoCard(repo));
            });

            $reposStatus.text(
                'Showing ' + publicRepos.length + ' public repositories' + (fromCache ? ' (5 min cache).' : '.')
            );
            customScroll();
        }

        var cachedRepos = getCachedRepos(cacheKey, cacheTtlMs);
        if (cachedRepos) {
            renderRepos(cachedRepos, true);
            return;
        }

        $.ajax({
            url: apiUrl,
            method: 'GET',
            dataType: 'json',
            timeout: 10000
        }).done(function(repos) {
            setCachedRepos(cacheKey, repos);
            renderRepos(repos, false);
        }).fail(function() {
            $reposStatus.text('Could not load GitHub repositories right now.');
        });
    }

    // Contact form validator
    $(function () {

        $('#contact-form').validator();

        $('#contact-form').on('submit', function (e) {
            if (!e.isDefaultPrevented()) {
                var url = "contact_form/contact_form.php";

                $.ajax({
                    type: "POST",
                    url: url,
                    data: $(this).serialize(),
                    success: function (data)
                    {
                        var messageAlert = 'alert-' + data.type;
                        var messageText = data.message;

                        var alertBox = '<div class="alert ' + messageAlert + ' alert-dismissable"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>' + messageText + '</div>';
                        if (messageAlert && messageText) {
                            $('#contact-form').find('.messages').html(alertBox);
                            $('#contact-form')[0].reset();
                        }
                    }
                });
                return false;
            }
        });
    });
    // /Contact form validator

    // Hide Mobile menu
    function mobileMenuHide() {
        var windowWidth = $(window).width();
        if (windowWidth < 1024) {
            $('#site_header').addClass('mobile-menu-hide');
        }
    }
    // /Hide Mobile menu

    // Custom scroll
    function customScroll() {
        var windowWidth = $(window).width();
        if (windowWidth > 991) {
            // Custom Subpage Scroll
            $(".pt-page").mCustomScrollbar({
                scrollInertia: 8,
                documentTouchScroll: false
            });

            // Custom Header Scroll
            $("#site_header").mCustomScrollbar({
                scrollInertia: 8,
                documentTouchScroll: false
            });
        } else {
            $(".pt-page").mCustomScrollbar('destroy');

            $("#site_header").mCustomScrollbar('destroy');
        }
    }
    // /Custom scroll

    //On Window load & Resize
    $(window)
        .on('load', function() { //Load
            // Animation on Page Loading
            $(".preloader").fadeOut("slow");

            // initializing page transition.
            var ptPage = $('.subpages');
            if (ptPage[0]) {
                if (typeof PageTransitions !== 'undefined' && PageTransitions.init) {
                    PageTransitions.init({
                        menu: 'ul.site-main-menu',
                    });
                } else {
                    console.warn('[PageTransitions] library not loaded yet or unavailable. Skipping init.');
                }
            }
            customScroll();
        })
        .on('resize', function() { //Resize
             mobileMenuHide();
             customScroll();
        });


    // On Document Load
    $(document).ready(function() {
        // Initialize Portfolio grid
        var $portfolio_container = $("#portfolio-grid");

        $portfolio_container.imagesLoaded(function () {
            setTimeout(function(){
                portfolio_init(this);
            }, 500);
        });

        // Portfolio hover effect init
        $(' #portfolio_grid > figure > a ').each( function() { $(this).hoverdir(); } );

        // Mobile menu
        $('.menu-toggle').on("click", function () {
            $('#site_header').toggleClass('mobile-menu-hide');
        });

        // Mobile menu hide on main menu item click
        $('.site-main-menu').on("click", "a", function (e) {
            mobileMenuHide();
        });

        // Testimonials Slider
        $(".testimonials.owl-carousel").owlCarousel({
            nav: true, // Show next/prev buttons.
            items: 3, // The number of items you want to see on the screen.
            loop: false, // Infinity loop. Duplicate last and first items to get loop illusion.
            navText: false,
            margin: 10,
            responsive : {
                // breakpoint from 0 up
                0 : {
                    items: 1,
                },
                // breakpoint from 480 up
                480 : {
                    items: 1,
                },
                // breakpoint from 768 up
                768 : {
                    items: 2,
                },
                1200 : {
                    items: 3,
                }
            }
        });

        // Text rotation
        $('.text-rotation').owlCarousel({
            loop: true,
            dots: false,
            nav: false,
            margin: 10,
            items: 1,
            autoplay: true,
            autoplayHoverPause: false,
            autoplayTimeout: 3800,
            animateOut: 'zoomOut',
            animateIn: 'zoomIn'
        });

        // Lightbox init
        $('.lightbox').magnificPopup({
            type: 'image',
            removalDelay: 300,

            // Class that is added to popup wrapper and background
            // make it unique to apply your CSS animations just to this exact popup
            mainClass: 'mfp-fade',
            image: {
                // options for image content type
                titleSrc: 'title',
                gallery: {
                    enabled: true
                },
            },

            iframe: {
                markup: '<div class="mfp-iframe-scaler">'+
                        '<div class="mfp-close"></div>'+
                        '<iframe class="mfp-iframe" frameborder="0" allowfullscreen></iframe>'+
                        '<div class="mfp-title mfp-bottom-iframe-title"></div>'+
                      '</div>', // HTML markup of popup, `mfp-close` will be replaced by the close button

                patterns: {
                    youtube: {
                      index: 'youtube.com/', // String that detects type of video (in this case YouTube). Simply via url.indexOf(index).

                      id: 'v=', // String that splits URL in a two parts, second part should be %id%
                      // Or null - full URL will be returned
                      // Or a function that should return %id%, for example:
                      // id: function(url) { return 'parsed id'; }

                      src: '//www.youtube.com/embed/%id%?autoplay=1' // URL that will be set as a source for iframe.
                    },
                    vimeo: {
                      index: 'vimeo.com/',
                      id: '/',
                      src: '//player.vimeo.com/video/%id%?autoplay=1'
                    },
                    gmaps: {
                      index: '//maps.google.',
                      src: '%id%&output=embed'
                    }
                },

                srcAction: 'iframe_src', // Templating object key. First part defines CSS selector, second attribute. "iframe_src" means: find "iframe" and set attribute "src".
            },

            callbacks: {
                markupParse: function(template, values, item) {
                 values.title = item.el.attr('title');
                }
            },
        });

        $('.ajax-page-load-link').magnificPopup({
            type: 'ajax',
            removalDelay: 300,
            mainClass: 'mfp-fade',
            gallery: {
                enabled: true
            },
        });

        $('.tilt-effect').tilt({

        });

        initGithubRepos();

    });

})(jQuery);
