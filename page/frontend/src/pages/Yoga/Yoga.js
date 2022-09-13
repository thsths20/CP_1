import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs';
import React, { useRef, useState, useEffect } from 'react'
import Webcam from 'react-webcam'
import { success } from '../../utils/music'; 
 
import Instructions from '../../components/Instrctions/Instructions';

import './Yoga.css'
 
import DropDown from '../../components/DropDown/DropDown';
import { poseImages } from '../../utils/pose_images';
import { POINTS, keypointConnections } from '../../utils/data';
import { drawPoint, drawSegment } from '../../utils/helper'



let skeletonColor = 'rgb(255,255,255)'
let poseList = [
  '나무', '의자', '코브라', '전사', '견상',
   '삼각'
]

let interval

// flag variable is used to help capture the time when AI just detect 
// the pose as correct(probability more than threshold)
let flag = false

function Yoga() {
  const webcamRef = useRef(null)
  const canvasRef = useRef(null)


  const [currentTime, setCurrentTime] = useState(0)
  const [poseTime, setPoseTime] = useState(0)
  const [currentPose, setCurrentPose] = useState('나무')
  const [isStartPose, setIsStartPose] = useState(false)
  
  
  

  useEffect(() => {
    if (flag) {
      setPoseTime(poseTime + 1)
      console.log(currentTime)

      if (poseTime == 30) {
        alert("수련을 마치셨습니다. 요가 메뉴 화면으로 돌아갑니다")
        window.location.href = "/start"
      }
    }

    

  }, [currentTime])


  useEffect(() => {
    setCurrentTime(0)
    setPoseTime(0)

  }, [currentPose])

  const CLASS_NO = {
    의자: 0,
    코브라: 1,
    견상: 2,
    No_Pose: 3,
    // Shoulderstand: 4,
    삼각: 5,
    나무: 6,
    전사: 7,
  }

  function get_center_point(landmarks, left_bodypart, right_bodypart) {
    let left = tf.gather(landmarks, left_bodypart, 1)
    let right = tf.gather(landmarks, right_bodypart, 1)
    const center = tf.add(tf.mul(left, 0.5), tf.mul(right, 0.5))
    return center
    
  }

  function get_pose_size(landmarks, torso_size_multiplier=2.5) {
    let hips_center = get_center_point(landmarks, POINTS.LEFT_HIP, POINTS.RIGHT_HIP)
    let shoulders_center = get_center_point(landmarks,POINTS.LEFT_SHOULDER, POINTS.RIGHT_SHOULDER)
    let torso_size = tf.norm(tf.sub(shoulders_center, hips_center))
    let pose_center_new = get_center_point(landmarks, POINTS.LEFT_HIP, POINTS.RIGHT_HIP)
    pose_center_new = tf.expandDims(pose_center_new, 1)

    pose_center_new = tf.broadcastTo(pose_center_new,
        [1, 17, 2]
      )
      // return: shape(17,2)
    let d = tf.gather(tf.sub(landmarks, pose_center_new), 0, 0)
    let max_dist = tf.max(tf.norm(d,'euclidean', 0))

    // normalize scale
    let pose_size = tf.maximum(tf.mul(torso_size, torso_size_multiplier), max_dist)
    return pose_size
  }

  function normalize_pose_landmarks(landmarks) {
    let pose_center = get_center_point(landmarks, POINTS.LEFT_HIP, POINTS.RIGHT_HIP)
    pose_center = tf.expandDims(pose_center, 1)
    pose_center = tf.broadcastTo(pose_center, 
        [1, 17, 2]
      )
    landmarks = tf.sub(landmarks, pose_center)

    let pose_size = get_pose_size(landmarks)
    landmarks = tf.div(landmarks, pose_size)
    return landmarks
  }

  function landmarks_to_embedding(landmarks) {
    // normalize landmarks 2D
    landmarks = normalize_pose_landmarks(tf.expandDims(landmarks, 0))
    let embedding = tf.reshape(landmarks, [1,34])
    return embedding
  }

  const runMovenet = async () => {
    const detectorConfig = {modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER};
    const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, detectorConfig);
    const poseClassifier = await tf.loadLayersModel('https://raw.githubusercontent.com/thsths20/cp1/main/model.json')
    const successAudio = new Audio(success)
    interval = setInterval(() => { 
        detectPose(detector, poseClassifier, successAudio)
    }, 100)
  }

  const detectPose = async (detector, poseClassifier, successAudio) => {
    if (
      typeof webcamRef.current !== "undefined" &&
      webcamRef.current !== null &&
      webcamRef.current.video.readyState === 4
    ) {
      let notDetected = 0 
      const video = webcamRef.current.video
      const pose = await detector.estimatePoses(video)
      const ctx = canvasRef.current.getContext('2d')
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      try {
        const keypoints = pose[0].keypoints 
        let input = keypoints.map((keypoint) => {
          if(keypoint.score > 0.4) {
            if(!(keypoint.name === 'left_eye' || keypoint.name === 'right_eye')) {
              drawPoint(ctx, keypoint.x, keypoint.y, 8, 'rgb(255,255,255)')
              let connections = keypointConnections[keypoint.name]
              try {
                connections.forEach((connection) => {
                  let conName = connection.toUpperCase()
                  drawSegment(ctx, [keypoint.x, keypoint.y],
                      [keypoints[POINTS[conName]].x,
                       keypoints[POINTS[conName]].y]
                  , skeletonColor)
                })
              } catch(err) {

              }
              
            }
          } else {
            notDetected += 1
          } 
          return [keypoint.x, keypoint.y]
        }) 
        if(notDetected > 4) {
          skeletonColor = 'rgb(255,255,255)'
          return
        }
        const processedInput = landmarks_to_embedding(input)
        const classification = poseClassifier.predict(processedInput)
        
        classification.array().then((data) => {
          const classNo = CLASS_NO[currentPose]
          
          if (data[0][classNo] > 0.97) {

            if (!flag) {
              successAudio.play()
              flag = true
            }
            setCurrentTime(new Date(Date()).getTime())
            skeletonColor = 'rgb(0,255,0)'
          } else {
            flag = false
            skeletonColor = 'rgb(255,255,255)'
            successAudio.pause()
            successAudio.currentTime = 0
          }
        })
      } catch (err) {
        console.log(err)
      }


    }
  }

  function startYoga() {
    setIsStartPose(true)
    runMovenet()
  }

  function stopPose() {
    setIsStartPose(false)
    clearInterval(interval)
    setPoseTime(0)
  }

  


  if (isStartPose) {
    return (
      <div className="yoga-container">
        <div className="performance-container">
          <div className="pose-performance">
            <h4>수련 시간: {poseTime}초</h4>
          </div>
          
        </div>
        <div>
          <div>
            <img
              src={poseImages[currentPose]}
              className="pose-img"
            />
          </div>
          <Webcam
            width='640px'
            height='480px'
            id="webcam"
            ref={webcamRef}
            style={{
              position: 'absolute',
              left: 120,
              top: 100,
              padding: '0px',
            }}
          />
          <canvas
            ref={canvasRef}
            id="my-canvas"
            width='640px'
            height='480px'
            style={{
              position: 'absolute',
              left: 120,
              top: 100,
              zIndex: 1
            }}
          />


        </div>
        <div>
          <button
            onClick={stopPose}
            className="secondary-btn"
          >그만하기</button>
        </div>
      </div>


 

    )
  }

  return (
    <div
      className="yoga-container"
    >
     
        <DropDown
          poseList={poseList}
          currentPose={currentPose}
          setCurrentPose={setCurrentPose}
        />
        <Instructions
            currentPose={currentPose}
 
          />

        <button
            onClick={startYoga}
            className="secondary-btn"    
          >시작하기</button>
    </div>
  )
}

export default Yoga