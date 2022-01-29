<?php

/*****************************************
 ** PHP Settings
 *****************************************/
error_reporting(E_ALL);
ini_set('display_errors', 'on');

require_once APPLICATION_PATH . '/vendor/autoload.php';

/*****************************************
 ** Namespace Definitions
 *****************************************/
use Silex\Application;
use Symfony\Component\HttpFoundation;
use Iconorator\Service;

/*****************************************
 ** Start Silex Application
 *****************************************/
$app = new Application();
$app['debug'] = true;
$app['autoloader']->registerNamespace('Iconorator', APPLICATION_PATH . '/src');

/*****************************************
 ** Register Providers
 *****************************************/
$app->register(new Silex\Provider\HttpCacheServiceProvider(), array(
    'http_cache.cache_dir'  => APPLICATION_PATH . '/cache/http/',
    'http_cache.options'    => array('debug' => true),
));

$app->register(new Silex\Provider\TwigServiceProvider(), array(
    'twig.path'             => APPLICATION_PATH . '/views',
    'twig.class_path'       => APPLICATION_PATH . '/vendor/twig/twig/lib',
    'twig.options'          => array('cache' => APPLICATION_PATH . '/cache/twig/'),
));

$app->register(new Silex\Provider\MonologServiceProvider(), array(
    'monolog.logfile'       => APPLICATION_PATH . '/log/development.log',
    'monolog.class_path'    => APPLICATION_PATH . '/vendor/monolog/monolog/src',
));

/*****************************************
 ** Application Services
 *****************************************/
$app['set_service'] = $app->share(function() use ($app) {
    $cache = $app['memcache'];

    if (false === ($serialized = $cache->get('sets'))) {
        $app['monolog']->addDebug('load sets');
        $sets = new Service\Set(APPLICATION_PATH . '/public/iconsets');
        $cache->set('sets', serialize($sets), null, 3600);
    } else {
        $sets = unserialize($serialized);
        $app['monolog']->addDebug('got sets from cache');
    }

    return $sets;
});

$app['memcache'] = $app->share(function() {
    $memcache = new Memcache();
    $memcache->connect('localhost', 11211);

    return $memcache;
});

$app['db'] = $app->share(function() {
    return new PDO('sqlite:' . APPLICATION_PATH . '/data/app.sqlite');
});

$app->before(function() use ($app) {
    $setKeyVals = array();
    foreach ($app['set_service']->getAllSets() as $slug => $set) {
        $setKeyVals[$slug] = $set->name;
    }
    $app['twig']->addGlobal('setNames', $setKeyVals);
});

/*****************************************
 ** Routes
 *****************************************/

/**
 * The homepage
 */
$app->get('/', function() use ($app) {
    return new HttpFoundation\Response(
        $app['twig']->render('index.twig'),
        200,
        array('Cache-Control' => 's-maxage=3600')
    );
});

/**
 * The catch-all about/credits page
 */
$app->get('/credits', function() use ($app) {
    return new HttpFoundation\Response(
        $app['twig']->render('credits.twig', array(
            'sets' => $app['set_service']->getAllSets()
        )),
        200,
        array('Cache-Control' => 's-maxage=3600')
    );
});

/**
 * Display all available icon sets with info/credits
 */
$app->get('/sets', function() use ($app) {
    return new HttpFoundation\Response(
        $app['twig']->render('sets.twig', array(
            'sets' => $app['set_service']->getAllSets()
        )),
        200,
        array('Cache-Control' => 's-maxage=3600')
    );
});

/**
 * Build a new or previously saved custom icon set
 */
$app->get('/sets/{slug}/{ref}', function(Application $app, $slug, $ref) {
    $icons = array();
    $settings = array(
        'baseClass' => 'icon',
        'prefix' => 'icon_',
        'spriteName' => 'icons',
    );

    if ($ref) {
        $id = base_convert($ref, 36, 10);
        $db = $app['db'];

        $stmt = $db->prepare("SELECT * FROM builds WHERE id = :id");
        $stmt->execute(array(":id" => $id));
        $row = $stmt->fetch();

        if (!$row) {
            $app['monolog']->addWarning('Could not find build with id of: ' . $id);

            return $app['twig']->render('notfound.twig');
        }

        $icons = explode(',', $row['icons']);
        $settings = json_decode($row['settings']);
    }

    return new HttpFoundation\Response(
        $app['twig']->render('build.twig', array(
            'set' => $app['set_service']->getSetBySlug($slug),
            'slug' => $slug,
            'icons' => json_encode($icons),
            'settings' => $settings,
        )),
        200,
        array('Cache-Control' => 's-maxage=3600')
    );
})->value('ref', null);

/**
 * Save a build for future reference
 */
$app->post('/save', function(HttpFoundation\Request $request, Application $app) {
    $db = $app['db'];

    $slug = $request->get('set');
    $icons = $request->get('icons');
    $settings = json_encode($request->get('settings'));

    $app['monolog']->addDebug($icons);

    $stmt = $db->prepare("INSERT INTO builds (icon_slug, icons, settings) VALUES (:slug, :icons, :settings)");
    $stmt->bindParam(":slug", $slug);
    $stmt->bindParam(":icons", $icons);
    $stmt->bindParam(":settings", $settings);

    if ($stmt->execute()) {
        $lastInsert = $db->lastInsertId();
        $code = base_convert($lastInsert, 10, 36);

        $result = array(
            'success' => true,
            'id' => $code,
            'downloadUrl' => 'http://iconorator.com/sets/' . $slug . '/' . $code
        );
    } else {
        $app['monolog']->addError('Unable to save build to database: ' . print_r($db->errorInfo, true));

        $result = array(
            'success' => false
        );
    }

    return $app->json($result);
});

/*****************************************
 ** Run the app
 *****************************************/
//$app['http_cache']->run();
$app->run();
