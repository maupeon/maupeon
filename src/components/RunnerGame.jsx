import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Box, Sphere, Cylinder, Sky, Stars, Html } from '@react-three/drei'
import * as THREE from 'three'

const GRAVITY = 0.02
const JUMP_FORCE = 0.35
const INITIAL_SPEED = 0.2
const OBSTACLE_SPAWN_RATE = 100 // Frames

function RunnerModel({ yPos, isJumping, isGameOver }) {
  const group = useRef()
  const leftLeg = useRef()
  const rightLeg = useRef()
  const leftArm = useRef()
  const rightArm = useRef()

  useFrame(({ clock }) => {
    if (isGameOver) return

    const t = clock.getElapsedTime() * 15

    if (isJumping) {
      // Jumping pose
      if (leftLeg.current) leftLeg.current.rotation.x = 0.5
      if (rightLeg.current) rightLeg.current.rotation.x = -0.5
      if (leftArm.current) leftArm.current.rotation.x = -2.5
      if (rightArm.current) rightArm.current.rotation.x = -2.5
    } else {
      // Running animation
      if (leftLeg.current) leftLeg.current.rotation.x = Math.sin(t) * 0.8
      if (rightLeg.current)
        rightLeg.current.rotation.x = Math.sin(t + Math.PI) * 0.8
      if (leftArm.current)
        leftArm.current.rotation.x = Math.sin(t + Math.PI) * 0.8
      if (rightArm.current) rightArm.current.rotation.x = Math.sin(t) * 0.8
    }

    if (group.current) {
      group.current.position.y = yPos
    }
  })

  const bodyColor = '#eab308' // Yellow-500
  const skinColor = '#fca5a5' // Red-300 (Pinkish)
  const shortsColor = '#1e3a8a' // Blue-900

  return (
    <group ref={group} position={[0, 0, 0]}>
      {/* Torso */}
      <Box args={[0.4, 0.5, 0.2]} position={[0, 0.75, 0]}>
        <meshStandardMaterial color={bodyColor} />
      </Box>

      {/* Head */}
      <Sphere args={[0.15, 16, 16]} position={[0, 1.1, 0]}>
        <meshStandardMaterial color={skinColor} />
      </Sphere>

      {/* Arms */}
      <group position={[-0.25, 0.9, 0]}>
        <Box ref={leftArm} args={[0.1, 0.4, 0.1]} position={[0, -0.15, 0]}>
          <meshStandardMaterial color={skinColor} />
        </Box>
      </group>
      <group position={[0.25, 0.9, 0]}>
        <Box ref={rightArm} args={[0.1, 0.4, 0.1]} position={[0, -0.15, 0]}>
          <meshStandardMaterial color={skinColor} />
        </Box>
      </group>

      {/* Legs */}
      <group position={[-0.1, 0.5, 0]}>
        <Box ref={leftLeg} args={[0.12, 0.5, 0.12]} position={[0, -0.25, 0]}>
          <meshStandardMaterial color={shortsColor} />
        </Box>
      </group>
      <group position={[0.1, 0.5, 0]}>
        <Box ref={rightLeg} args={[0.12, 0.5, 0.12]} position={[0, -0.25, 0]}>
          <meshStandardMaterial color={shortsColor} />
        </Box>
      </group>
    </group>
  )
}

function Obstacle({ position }) {
  return (
    <group position={position}>
      <Box args={[0.8, 0.8, 0.8]} position={[0, 0.4, 0]}>
        <meshStandardMaterial color="#ef4444" />
      </Box>
      {/* Spikes or details */}
      <Cylinder
        args={[0.05, 0.05, 1.2]}
        rotation={[0, 0, Math.PI / 2]}
        position={[0, 0.4, 0]}
      >
        <meshStandardMaterial color="#7f1d1d" />
      </Cylinder>
      <Cylinder
        args={[0.05, 0.05, 1.2]}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0.4, 0]}
      >
        <meshStandardMaterial color="#7f1d1d" />
      </Cylinder>
    </group>
  )
}

function Track() {
  const mesh = useRef()
  useFrame((state, delta) => {
    if (mesh.current) {
      mesh.current.position.z += 10 * delta
      if (mesh.current.position.z > 20) {
        mesh.current.position.z = 0
      }
    }
  })

  return (
    <group ref={mesh}>
      {/* Ground */}
      <Box args={[10, 0.1, 100]} position={[0, -0.05, -40]}>
        <meshStandardMaterial color="#4ade80" />
      </Box>
      {/* Track */}
      <Box args={[3, 0.11, 100]} position={[0, -0.04, -40]}>
        <meshStandardMaterial color="#a8a29e" />
      </Box>
      {/* Lines */}
      {Array.from({ length: 20 }).map((_, i) => (
        <Box key={i} args={[0.2, 0.12, 2]} position={[0, -0.03, -i * 10]}>
          <meshStandardMaterial color="#ffffff" />
        </Box>
      ))}
    </group>
  )
}

function GameLogic({ setScore, setGameOver, isPlaying, setIsPlaying }) {
  const runnerY = useRef(0)
  const runnerVel = useRef(0)
  const isJumping = useRef(false)
  const obstacles = useRef([])
  const speed = useRef(INITIAL_SPEED)
  const frameCount = useRef(0)
  const scoreRef = useRef(0)

  // Input handling
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        (e.code === 'Space' || e.code === 'ArrowUp') &&
        !isJumping.current &&
        isPlaying
      ) {
        runnerVel.current = JUMP_FORCE
        isJumping.current = true
      }
      if (e.code === 'Space' && !isPlaying) {
        // Restart logic handled by UI
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPlaying])

  // Reset game
  useEffect(() => {
    if (isPlaying) {
      runnerY.current = 0
      runnerVel.current = 0
      isJumping.current = false
      obstacles.current = []
      speed.current = INITIAL_SPEED
      scoreRef.current = 0
      setScore(0)
      setGameOver(false)
    }
  }, [isPlaying, setScore, setGameOver])

  useFrame((state, delta) => {
    if (!isPlaying) return

    // Physics
    runnerY.current += runnerVel.current
    runnerVel.current -= GRAVITY

    if (runnerY.current <= 0) {
      runnerY.current = 0
      runnerVel.current = 0
      isJumping.current = false
    }

    // Obstacle Spawning
    frameCount.current += 1
    // Spawn rate increases with speed
    const currentSpawnRate = Math.max(
      40,
      OBSTACLE_SPAWN_RATE - Math.floor(scoreRef.current / 50)
    )

    if (frameCount.current % currentSpawnRate === 0) {
      obstacles.current.push({
        id: Date.now(),
        z: -40, // Spawn far away
        passed: false,
      })
    }

    // Update Obstacles
    obstacles.current.forEach((obs) => {
      obs.z += speed.current * (delta * 60) // Normalize to 60fps
    })

    // Cleanup old obstacles
    obstacles.current = obstacles.current.filter((obs) => obs.z < 10)

    // Collision Detection
    const runnerBox = new THREE.Box3(
      new THREE.Vector3(-0.2, runnerY.current, -0.2),
      new THREE.Vector3(0.2, runnerY.current + 1.2, 0.2)
    )

    for (let obs of obstacles.current) {
      const obsBox = new THREE.Box3(
        new THREE.Vector3(-0.4, 0, obs.z - 0.4),
        new THREE.Vector3(0.4, 0.8, obs.z + 0.4)
      )

      if (runnerBox.intersectsBox(obsBox)) {
        setIsPlaying(false)
        setGameOver(true)
      }

      // Score
      if (!obs.passed && obs.z > 0.5) {
        obs.passed = true
        scoreRef.current += 10
        setScore(scoreRef.current)
        speed.current += 0.005 // Increase speed
      }
    }
  })

  return (
    <>
      <RunnerModel
        yPos={runnerY.current}
        isJumping={isJumping.current}
        isGameOver={!isPlaying}
      />
      {obstacles.current.map((obs) => (
        <Obstacle key={obs.id} position={[0, 0, obs.z]} />
      ))}
      <Track />
    </>
  )
}

export function RunnerGame() {
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  return (
    <div className="relative w-full overflow-hidden border shadow-2xl h-96 rounded-xl border-zinc-200 bg-sky-300 dark:border-zinc-700">
      <Canvas shadows camera={{ position: [4, 3, 5], fov: 50 }}>
        <Sky sunPosition={[100, 20, 100]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} castShadow />

        <GameLogic
          setScore={setScore}
          setGameOver={setGameOver}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
        />
      </Canvas>

      {/* UI Overlay */}
      <div className="absolute font-mono text-2xl font-bold text-white top-4 right-4 drop-shadow-md">
        Score: {score}
      </div>

      {!isPlaying && !gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="text-center text-white">
            <h2 className="mb-4 text-4xl font-bold">Ready?</h2>
            <button
              onClick={() => setIsPlaying(true)}
              className="px-6 py-3 text-xl font-bold text-white transition transform bg-yellow-500 rounded-full hover:scale-105 hover:bg-yellow-400 active:scale-95"
            >
              Start Run
            </button>
            <p className="mt-4 text-sm opacity-80">
              Press Space or Tap to Jump
            </p>
          </div>
        </div>
      )}

      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/60 backdrop-blur-md">
          <div className="text-center text-white">
            <h2 className="mb-2 text-5xl font-bold">Game Over</h2>
            <p className="mb-6 text-2xl">Final Score: {score}</p>
            <button
              onClick={() => setIsPlaying(true)}
              className="px-6 py-3 text-xl font-bold text-red-600 transition transform bg-white rounded-full hover:scale-105 hover:bg-gray-100 active:scale-95"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Jump button for mobile */}
      {isPlaying && (
        <div
          className="absolute inset-0 z-10"
          onClick={() => {
            window.dispatchEvent(
              new KeyboardEvent('keydown', { code: 'Space' })
            )
          }}
        />
      )}
    </div>
  )
}
