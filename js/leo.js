var twist;
var manager;
var ros;
var batterySub;
var batterySub1;
var cmdVelPub;
var servo1Pub, servo2Pub, servo3Pub;
var servo1Val, servo2Val, servo3Val;
var servo1Last = 0, servo2Last = 0, servo3Last = 0;
var twistIntervalID;
var servoIntervalID;
var robot_hostname;
var temperatureSub;
var temperatureIntSub;
var humiditySub;

var max_linear_speed = 0.5;
var max_angular_speed = 1.2;

var namespaceSub;
var robot_namespace;

var publishersClient;
var topicsForTypeClient;

var select;

function initROS() {

    ros = new ROSLIB.Ros({
        url: "ws://" + robot_hostname + ":9090"
    });

    // Init message with zero values.
    twist = new ROSLIB.Message({
        linear: {
            x: 0,
            y: 0,
            z: 0
        },
        angular: {
            x: 0,
            y: 0,
            z: 0
        }
    });

    cmdVelPub = new ROSLIB.Topic({
        ros: ros,
        name: 'cmd_vel',
        messageType: 'geometry_msgs/Twist',
        queue_size: 10
    });

    cmdVelPub.advertise();

    servo1Pub = new ROSLIB.Topic({
        ros: ros,
        name: 'commands/joint_single',
        messageType: 'interbotix_xs_msgs/JointSingleCommand',
        latch: true,
        queue_size: 5
    });

    servo2Pub = new ROSLIB.Topic({
        ros: ros,
        name: 'commands/joint_single',
        messageType: 'interbotix_xs_msgs/JointSingleCommand',
        latch: true,
        queue_size: 5
    });

    servo3Pub = new ROSLIB.Topic({
        ros: ros,
        name: 'servo3/angle',
        messageType: 'std_msgs/Int16',
        latch: true,
        queue_size: 5
    });

    servo1Pub.advertise();
    servo2Pub.advertise();
    servo3Pub.advertise();
    
    relay1Pub = new ROSLIB.Topic({
        ros: ros,
        name: '/relay1',
        messageType: 'std_msgs/Bool',
        queue_size: 5
    });

    relay2Pub = new ROSLIB.Topic({
        ros: ros,
        name: '/relay2',
        messageType: 'std_msgs/Bool',
        queue_size: 5
    });

    relay3Pub = new ROSLIB.Topic({
        ros: ros,
        name: '/relay3',
        messageType: 'std_msgs/Bool',
        queue_size: 5
    });

    relay4Pub = new ROSLIB.Topic({
        ros: ros,
        name: '/relay4',
        messageType: 'std_msgs/Bool',
        queue_size: 5
    });

    relay1Pub.advertise();
    relay2Pub.advertise();
    relay3Pub.advertise();
    relay4Pub.advertise();
    
    
    systemRebootPub = new ROSLIB.Topic({
        ros: ros,
        name: 'system/reboot',
        messageType: 'std_msgs/Empty'
    });
    systemRebootPub.advertise();

    systemShutdownPub = new ROSLIB.Topic({
        ros: ros,
        name: 'system/shutdown',
        messageType: 'std_msgs/Empty'
    });
    systemShutdownPub.advertise();

    batterySub = new ROSLIB.Topic({
        ros: ros,
        name: 'battery',
        messageType: 'std_msgs/Float32',
        queue_length: 1
    });
    batterySub.subscribe(batteryCallback);

    batterySub1 = new ROSLIB.Topic({
        ros: ros,
        name: 'firmware/battery',
        messageType: 'std_msgs/Float32',
        queue_length: 1
    });
    batterySub1.subscribe(batteryCallback);
    
    
    temperatureSub = new ROSLIB.Topic({
        ros: ros,
        name: 'temperature',
        messageType: 'sensor_msgs/Temperature',
        queue_length: 1
    });
    temperatureSub.subscribe(temperatureCallback);


    temperatureIntSub = new ROSLIB.Topic({
        ros: ros,
        name: 'firmware/imu',
        messageType: 'leo_msgs/Imu',
        queue_length: 1
    });
    temperatureIntSub.subscribe(temperatureIntCallback);


    humiditySub = new ROSLIB.Topic({
        ros: ros,
        name: 'humidity',
        messageType: 'sensor_msgs/RelativeHumidity',
        queue_length: 1
    });
    humiditySub.subscribe(humidityCallback);
    
    

    namespaceSub = new ROSLIB.Topic({
        ros: ros,
        name: 'robot_namespace',
        messageType: 'std_msgs/String',
        queue_length: 1
    });
    namespaceSub.subscribe(namespaceCallback);

    publishersClient = new ROSLIB.Service({
        ros : ros,
        name : '/rosapi/publishers',
        serviceType : '/rosapi/Publishers'
    });
    
    topicsForTypeClient = new ROSLIB.Service({
        ros : ros,
        name : '/rosapi/topics_for_type',
        serviceType : '/rosapi/TopicsForType'
    });
    
}


function initSliders() {

    $('#s1-slider').slider({
        tooltip: 'show',
        min: -1.20,
        max: 1.20,
        step: 0.1,
        value: 0
    });
    $('#s1-slider').on("slide", function (slideEvt) {
        servo1Val = slideEvt.value;
    });

    $('#s2-slider').slider({
        tooltip: 'show',
        min: -1.50,
        max: 0.50,
        step: 0.1,
        value: 0
    });
    $('#s2-slider').on("slide", function (slideEvt) {
        servo2Val = slideEvt.value;
    });

    $('#s3-slider').slider({
        tooltip: 'show',
        min: -90,
        max: 90,
        step: 1,
        value: 0
    });
    $('#s3-slider').on("slide", function (slideEvt) {
        servo3Val = slideEvt.value;
    });
}

function createJoystick() {

    joystickContainer = document.getElementById('joystick');

    manager = nipplejs.create({
        zone: joystickContainer,
        position: { left: 65 + '%', top: 50 + '%' },
        mode: 'static',
        size: 200,
        color: '#ffffff',
        restJoystick: true
    });

    manager.on('move', function (evt, nipple) {

        var lin = Math.sin(nipple.angle.radian) * nipple.distance * 0.01;
        var ang = -Math.cos(nipple.angle.radian) * nipple.distance * 0.01;

        twist.linear.x = lin * max_linear_speed;
        twist.angular.z = ang * max_angular_speed;
    });

    manager.on('end', function () {
        twist.linear.x = 0
        twist.angular.z = 0
    });
}

function initTeleopKeyboard() {
    const left_keys = ["ArrowLeft", "a", "A"];
    const right_keys = ["ArrowRight", "d", "D"];
    const up_keys = ["ArrowUp", "w", "W"];
    const down_keys = ["ArrowDown", "s", "S"];

    var body = document.getElementsByTagName('body')[0];
    body.addEventListener('keydown', function (e) {
        if (left_keys.includes(e.key))
            twist.angular.z = max_angular_speed;
        else if (right_keys.includes(e.key))
            twist.angular.z = -max_angular_speed;
        else if (up_keys.includes(e.key))
            twist.linear.x = max_linear_speed;
        else if (down_keys.includes(e.key))
            twist.linear.x = -max_linear_speed;
    });
    body.addEventListener('keyup', function (e) {
        if (left_keys.includes(e.key) || right_keys.includes(e.key))
            twist.angular.z = 0;
        else if (up_keys.includes(e.key) || down_keys.includes(e.key))
            twist.linear.x = 0;
    });
}

function batteryCallback(message) {
    document.getElementById('batteryID').innerHTML = 'Voltage: ' + message.data.toPrecision(4) + 'V';
}

function temperatureCallback(message) {
    document.getElementById('temperatureID').innerHTML = 'Temperature: ' + message.temperature.toPrecision(3) + '°';
}

function temperatureIntCallback(message) {
    document.getElementById('temperatureIntID').innerHTML = 'MEB Temperature: ' + message.temperature.toPrecision(3) + '°';
}

function humidityCallback(message) {
    document.getElementById('humidityID').innerHTML = 'Humidity: ' + message.relative_humidity.toPrecision(3) + '%';
}


function namespaceCallback(message) {
    robot_namespace = message.data;
    video.src = "http://" + robot_hostname + ":8080/stream?topic=" + robot_namespace + "camera/image_raw&type=ros_compressed";
    const timeout = setTimeout(function () {selectCorrectOption(robot_namespace + "camera/image_raw");}, 3000);
}


function publishTwist() {
    cmdVelPub.publish(twist);
}

function publishServos() {
    var servoMsg;

    if (servo1Val != servo1Last) {
        servo1Last = servo1Val;
        servoMsg = new ROSLIB.Message({
            name: 'pan',
            cmd: servo1Val
        });
        servo1Pub.publish(servoMsg);
    }

    if (servo2Val != servo2Last) {
        servo2Last = servo2Val;
        servoMsg = new ROSLIB.Message({
            name: 'tilt',
            cmd: servo2Val
        });
        servo2Pub.publish(servoMsg);
    }

    if (servo3Val != servo3Last) {
        servo3Last = servo3Val;
        servoMsg = new ROSLIB.Message({
            data: servo3Val
        });
        servo3Pub.publish(servoMsg);
    }

}

function systemReboot() {
    systemRebootPub.publish()
}

function turnOff() {
    systemShutdownPub.publish()
}

window.onblur = function () {
    twist.linear.x = 0;
    twist.angular.z = 0;
    publishTwist();
}

function shutdown() {
    clearInterval(twistIntervalID);
    clearInterval(servoIntervalID);
    cmdVelPub.unadvertise();
    servo1Pub.unadvertise();
    servo2Pub.unadvertise();
    servo3Pub.unadvertise();
    systemRebootPub.unadvertise();
    systemShutdownPub.unadvertise();
    batterySub.unsubscribe();
    temperatureSub.unsubscribe();
    temperatureIntSub.unsubscribe();
    humiditySub.unsubscribe();
    ros.close();
}

function defaultVideoSrc() {
    namespaceSub.unsubscribe();
    
    if(typeof robot_namespace == 'undefined') {
        console.log("Unable to get the robot namespace. Assuming it's '/'.");
        video.src = "http://" + robot_hostname + ":8080/stream?topic=/camera/image_raw&type=ros_compressed";
        const timeout = setTimeout(function () {selectCorrectOption("/camera/image_raw"); }, 3000);
    }
}


function checkPublishers(topicName) {
    var request = new ROSLIB.ServiceRequest({topic : topicName});

    publishersClient.callService(request, function(result) {
	    var publishers = result.publishers;

        if(publishers.length != 0) {
            var opt = document.createElement('option');
            opt.innerHTML = topicName;
            select.appendChild(opt);
        }
    });
}

function getVideoTopics() {
    var request = new ROSLIB.ServiceRequest({type : "sensor_msgs/Image"});

    topicsForTypeClient.callService(request, function(result) {
	    var topics = result.topics;

	    for(var i = 0; i < topics.length; i++) {
	        checkPublishers(topics[i]);
	    }
    });
}

function changeVideoSrc() {
    var selected = select.selectedIndex;
    video.src = "http://" + robot_hostname + ":8080/stream?topic=" + select.options[selected].text + "&type=ros_compressed";
}

function selectCorrectOption(name) {
    for(var i = 0; i < select.options.length; i++) {
        if(select.options[i].text == name) {
            select.selectedIndex = i;
            break;
        }
    }
}

window.onload = function () {

    robot_hostname = location.hostname;

    initROS();
    initSliders();
    initTeleopKeyboard();
    createJoystick();
    getVideoTopics();

    video = document.getElementById('video');
    select = document.getElementById('camera-select');

    const timeout = setTimeout(defaultVideoSrc, 3000);

    twistIntervalID = setInterval(() => publishTwist(), 100); // 10 hz

    servoIntervalID = setInterval(() => publishServos(), 100); // 10 hz

    window.addEventListener("beforeunload", () => shutdown());
}


function rel1Trig(){
    var relayMsg;
    var checkBox = document.getElementById("relay-1");

    if (checkBox.checked == true){
       relayMsg = new ROSLIB.Message({
            data: true
        });
    }
    else {
        relayMsg = new ROSLIB.Message({
            data: false
        });
    }
    relay1Pub.publish(relayMsg);
    
}

function rel2Trig(){
    var relayMsg;
    var checkBox = document.getElementById("relay-2");

    if (checkBox.checked == true){
       relayMsg = new ROSLIB.Message({
            data: true
        });
    }
    else {
        relayMsg = new ROSLIB.Message({
            data: false
        });
    }
    relay2Pub.publish(relayMsg);
    
}

function rel3Trig(){
    var relayMsg;
    var checkBox = document.getElementById("relay-3");

    if (checkBox.checked == true){
       relayMsg = new ROSLIB.Message({
            data: true
        });
    }
    else {
        relayMsg = new ROSLIB.Message({
            data: false
        });
    }
    relay3Pub.publish(relayMsg);
    
}

function rel4Trig(){
    var relayMsg;
    var checkBox = document.getElementById("relay-4");

    if (checkBox.checked == true){
       relayMsg = new ROSLIB.Message({
            data: true
        });
    }
    else {
        relayMsg = new ROSLIB.Message({
            data: false
        });
    }
    relay4Pub.publish(relayMsg);
    
}



