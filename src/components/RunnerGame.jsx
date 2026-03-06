import React, { useState, useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import {
  Box,
  Sphere,
  Cylinder,
  Sky,
  ContactShadows,
} from '@react-three/drei'
import * as THREE from 'three'

const GRAVITY = 0.02
const JUMP_FORCE = 0.35
const INITIAL_SPEED = 0.2
const OBSTACLE_SPAWN_INTERVAL = 1.67
const OBSTACLE_POOL_SIZE = 15
const MARATHON_DISTANCE = 42195 // meters
const METERS_PER_POINT = 100 // score points to meters ratio

// Capsule-like limb using a cylinder with sphere caps
function Limb({ length, radius, color, ...props }) {
  return (
    <group {...props}>
      <Cylinder args={[radius, radius, length, 8]} position={[0, -length / 2, 0]}>
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.05} />
      </Cylinder>
      <Sphere args={[radius, 8, 8]} position={[0, 0, 0]}>
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.05} />
      </Sphere>
      <Sphere args={[radius, 8, 8]} position={[0, -length, 0]}>
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.05} />
      </Sphere>
    </group>
  )
}

function RunnerModel({ runnerYRef, isJumpingRef, isPlaying }) {
  const group = useRef()

  // Joint refs for animation
  const leftUpperLeg = useRef()
  const rightUpperLeg = useRef()
  const leftLowerLeg = useRef()
  const rightLowerLeg = useRef()
  const leftUpperArm = useRef()
  const rightUpperArm = useRef()
  const leftLowerArm = useRef()
  const rightLowerArm = useRef()
  const torsoRef = useRef()

  // Valencia Marathon colors
  const skinColor = '#e8b094'
  const shirtColor = '#f97316' // Valencia orange
  const shortsColor = '#1e3a5f' // Valencia blue
  const shoeColor = '#111827'
  const soleColor = '#f97316'
  const hairColor = '#3b2314'

  useFrame(({ clock }) => {
    if (!group.current) return
    group.current.position.y = runnerYRef.current

    if (!isPlaying) return
    const t = clock.getElapsedTime() * 10

    // Torso slight forward lean and bob
    if (torsoRef.current) {
      torsoRef.current.rotation.x = 0.12 + Math.sin(t * 2) * 0.02
      torsoRef.current.position.y = Math.abs(Math.sin(t)) * 0.03
    }

    if (isJumpingRef.current) {
      // Tuck position while jumping
      if (leftUpperLeg.current) leftUpperLeg.current.rotation.x = -0.8
      if (rightUpperLeg.current) rightUpperLeg.current.rotation.x = -0.4
      if (leftLowerLeg.current) leftLowerLeg.current.rotation.x = -0.9
      if (rightLowerLeg.current) rightLowerLeg.current.rotation.x = -0.6
      if (leftUpperArm.current) leftUpperArm.current.rotation.x = -1.2
      if (rightUpperArm.current) rightUpperArm.current.rotation.x = -1.2
      if (leftLowerArm.current) leftLowerArm.current.rotation.x = -0.8
      if (rightLowerArm.current) rightLowerArm.current.rotation.x = -0.8
    } else {
      // Realistic running cycle
      const stride = Math.sin(t)
      const strideOpp = Math.sin(t + Math.PI)

      // Upper legs swing forward/back
      if (leftUpperLeg.current) leftUpperLeg.current.rotation.x = stride * 1.0
      if (rightUpperLeg.current) rightUpperLeg.current.rotation.x = strideOpp * 1.0

      // Lower legs: bend back during push-off
      if (leftLowerLeg.current)
        leftLowerLeg.current.rotation.x = -Math.max(0, -stride) * 1.4 - 0.2
      if (rightLowerLeg.current)
        rightLowerLeg.current.rotation.x = -Math.max(0, -strideOpp) * 1.4 - 0.2

      // Arms swing opposite to legs
      if (leftUpperArm.current) leftUpperArm.current.rotation.x = strideOpp * 0.8
      if (rightUpperArm.current) rightUpperArm.current.rotation.x = stride * 0.8
      if (leftLowerArm.current)
        leftLowerArm.current.rotation.x = -Math.max(0, strideOpp) * 0.6 - 0.4
      if (rightLowerArm.current)
        rightLowerArm.current.rotation.x = -Math.max(0, stride) * 0.6 - 0.4
    }
  })

  return (
    <group ref={group} rotation={[0, Math.PI, 0]}>
      <group ref={torsoRef}>
        {/* ===== TORSO ===== */}
        {/* Chest - tapered cylinder */}
        <Cylinder args={[0.18, 0.15, 0.45, 8]} position={[0, 0.95, 0]}>
          <meshStandardMaterial color={shirtColor} roughness={0.7} />
        </Cylinder>
        {/* Race bib */}
        <Box args={[0.16, 0.12, 0.01]} position={[0, 0.88, 0.16]}>
          <meshStandardMaterial color="#ffffff" roughness={0.5} />
        </Box>
        {/* Abdomen */}
        <Cylinder args={[0.14, 0.16, 0.15, 8]} position={[0, 0.7, 0]}>
          <meshStandardMaterial color={shirtColor} roughness={0.7} />
        </Cylinder>

        {/* ===== HEAD & NECK ===== */}
        {/* Neck */}
        <Cylinder args={[0.05, 0.06, 0.1, 8]} position={[0, 1.22, 0]}>
          <meshStandardMaterial color={skinColor} roughness={0.8} />
        </Cylinder>
        {/* Head - slightly elongated sphere */}
        <group position={[0, 1.38, 0]}>
          <Sphere args={[0.11, 16, 16]} scale={[1, 1.15, 0.95]}>
            <meshStandardMaterial color={skinColor} roughness={0.8} />
          </Sphere>
          {/* Hair */}
          <Sphere args={[0.115, 16, 16]} scale={[1, 0.7, 0.98]} position={[0, 0.04, -0.01]}>
            <meshStandardMaterial color={hairColor} roughness={0.9} />
          </Sphere>
          {/* Eyes */}
          <Sphere args={[0.015, 8, 8]} position={[-0.04, 0, 0.1]}>
            <meshStandardMaterial color="#1a1a1a" />
          </Sphere>
          <Sphere args={[0.015, 8, 8]} position={[0.04, 0, 0.1]}>
            <meshStandardMaterial color="#1a1a1a" />
          </Sphere>
        </group>

        {/* ===== SHOULDERS ===== */}
        <Sphere args={[0.06, 8, 8]} position={[-0.22, 1.12, 0]}>
          <meshStandardMaterial color={shirtColor} roughness={0.7} />
        </Sphere>
        <Sphere args={[0.06, 8, 8]} position={[0.22, 1.12, 0]}>
          <meshStandardMaterial color={shirtColor} roughness={0.7} />
        </Sphere>

        {/* ===== LEFT ARM ===== */}
        <group position={[-0.22, 1.12, 0]}>
          <group ref={leftUpperArm}>
            <Limb length={0.28} radius={0.04} color={skinColor} />
            {/* Elbow joint */}
            <group position={[0, -0.28, 0]}>
              <group ref={leftLowerArm}>
                <Limb length={0.25} radius={0.035} color={skinColor} />
                {/* Hand */}
                <Sphere args={[0.04, 8, 8]} position={[0, -0.27, 0]}>
                  <meshStandardMaterial color={skinColor} roughness={0.8} />
                </Sphere>
              </group>
            </group>
          </group>
        </group>

        {/* ===== RIGHT ARM ===== */}
        <group position={[0.22, 1.12, 0]}>
          <group ref={rightUpperArm}>
            <Limb length={0.28} radius={0.04} color={skinColor} />
            <group position={[0, -0.28, 0]}>
              <group ref={rightLowerArm}>
                <Limb length={0.25} radius={0.035} color={skinColor} />
                <Sphere args={[0.04, 8, 8]} position={[0, -0.27, 0]}>
                  <meshStandardMaterial color={skinColor} roughness={0.8} />
                </Sphere>
              </group>
            </group>
          </group>
        </group>
      </group>

      {/* ===== HIPS ===== */}
      <Cylinder args={[0.16, 0.14, 0.08, 8]} position={[0, 0.6, 0]}>
        <meshStandardMaterial color={shortsColor} roughness={0.7} />
      </Cylinder>

      {/* ===== LEFT LEG ===== */}
      <group position={[-0.09, 0.58, 0]}>
        <group ref={leftUpperLeg}>
          {/* Thigh */}
          <Limb length={0.35} radius={0.06} color={shortsColor} />
          {/* Knee joint */}
          <group position={[0, -0.35, 0]}>
            <group ref={leftLowerLeg}>
              {/* Shin */}
              <Limb length={0.33} radius={0.045} color={skinColor} />
              {/* Shoe */}
              <group position={[0, -0.36, 0.04]}>
                <Box args={[0.1, 0.08, 0.2]} position={[0, 0, 0]}>
                  <meshStandardMaterial color={shoeColor} roughness={0.5} />
                </Box>
                <Box args={[0.1, 0.02, 0.22]} position={[0, -0.03, 0.01]}>
                  <meshStandardMaterial color={soleColor} roughness={0.4} />
                </Box>
              </group>
            </group>
          </group>
        </group>
      </group>

      {/* ===== RIGHT LEG ===== */}
      <group position={[0.09, 0.58, 0]}>
        <group ref={rightUpperLeg}>
          <Limb length={0.35} radius={0.06} color={shortsColor} />
          <group position={[0, -0.35, 0]}>
            <group ref={rightLowerLeg}>
              <Limb length={0.33} radius={0.045} color={skinColor} />
              <group position={[0, -0.36, 0.04]}>
                <Box args={[0.1, 0.08, 0.2]} position={[0, 0, 0]}>
                  <meshStandardMaterial color={shoeColor} roughness={0.5} />
                </Box>
                <Box args={[0.1, 0.02, 0.22]} position={[0, -0.03, 0.01]}>
                  <meshStandardMaterial color={soleColor} roughness={0.4} />
                </Box>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}

// Obstacle types: 0=cone, 1=barrier, 2=water station (wide)
function ObstacleCone() {
  return (
    <group>
      <Cylinder args={[0.02, 0.3, 0.9, 8]} position={[0, 0.45, 0]}>
        <meshStandardMaterial color="#f97316" roughness={0.5} />
      </Cylinder>
      <Cylinder args={[0.35, 0.35, 0.05, 8]} position={[0, 0.02, 0]}>
        <meshStandardMaterial color="#f97316" roughness={0.5} />
      </Cylinder>
      <Cylinder args={[0.12, 0.18, 0.1, 8]} position={[0, 0.55, 0]}>
        <meshStandardMaterial color="#ffffff" roughness={0.5} />
      </Cylinder>
    </group>
  )
}

function ObstacleBarrier() {
  return (
    <group>
      {/* Metal barrier */}
      <Box args={[1.2, 0.8, 0.1]} position={[0, 0.4, 0]}>
        <meshStandardMaterial color="#dc2626" roughness={0.4} metalness={0.3} />
      </Box>
      <Box args={[1.2, 0.06, 0.1]} position={[0, 0.55, 0]}>
        <meshStandardMaterial color="#ffffff" roughness={0.4} />
      </Box>
      {/* Legs */}
      <Box args={[0.06, 0.8, 0.3]} position={[-0.55, 0.4, 0]}>
        <meshStandardMaterial color="#6b7280" roughness={0.3} metalness={0.5} />
      </Box>
      <Box args={[0.06, 0.8, 0.3]} position={[0.55, 0.4, 0]}>
        <meshStandardMaterial color="#6b7280" roughness={0.3} metalness={0.5} />
      </Box>
    </group>
  )
}

function ObstacleWaterStation() {
  return (
    <group>
      {/* Table */}
      <Box args={[1.4, 0.05, 0.6]} position={[0, 0.7, 0]}>
        <meshStandardMaterial color="#ffffff" roughness={0.5} />
      </Box>
      {/* Legs */}
      <Cylinder args={[0.03, 0.03, 0.7, 6]} position={[-0.6, 0.35, -0.2]}>
        <meshStandardMaterial color="#9ca3af" roughness={0.3} />
      </Cylinder>
      <Cylinder args={[0.03, 0.03, 0.7, 6]} position={[0.6, 0.35, -0.2]}>
        <meshStandardMaterial color="#9ca3af" roughness={0.3} />
      </Cylinder>
      <Cylinder args={[0.03, 0.03, 0.7, 6]} position={[-0.6, 0.35, 0.2]}>
        <meshStandardMaterial color="#9ca3af" roughness={0.3} />
      </Cylinder>
      <Cylinder args={[0.03, 0.03, 0.7, 6]} position={[0.6, 0.35, 0.2]}>
        <meshStandardMaterial color="#9ca3af" roughness={0.3} />
      </Cylinder>
      {/* Cups */}
      {[-0.4, -0.1, 0.2, 0.5].map((x, i) => (
        <Cylinder key={i} args={[0.04, 0.03, 0.1, 6]} position={[x, 0.78, 0]}>
          <meshStandardMaterial color="#60a5fa" roughness={0.3} />
        </Cylinder>
      ))}
    </group>
  )
}

function ObstacleManager({ obstaclesRef }) {
  const meshes = useRef([])

  useFrame(() => {
    const obstacles = obstaclesRef.current
    meshes.current.forEach((mesh, i) => {
      if (mesh && obstacles[i]) {
        mesh.visible = true
        mesh.position.z = obstacles[i].z
        // Show correct obstacle type
        const type = obstacles[i].type || 0
        for (let c = 0; c < 3; c++) {
          if (mesh.children[c]) mesh.children[c].visible = c === type
        }
      } else if (mesh) {
        mesh.visible = false
      }
    })
  })

  return (
    <group>
      {Array.from({ length: OBSTACLE_POOL_SIZE }).map((_, i) => (
        <group
          key={i}
          ref={(el) => (meshes.current[i] = el)}
          visible={false}
          position={[0, 0, 0]}
        >
          <group><ObstacleCone /></group>
          <group visible={false}><ObstacleBarrier /></group>
          <group visible={false}><ObstacleWaterStation /></group>
        </group>
      ))}
    </group>
  )
}

// Mediterranean building block
function Building({ position, width, height, depth, wallColor, roofColor }) {
  return (
    <group position={position}>
      {/* Wall */}
      <Box args={[width, height, depth]} position={[0, height / 2, 0]}>
        <meshStandardMaterial color={wallColor} roughness={0.85} />
      </Box>
      {/* Roof */}
      <Box args={[width + 0.1, 0.08, depth + 0.1]} position={[0, height + 0.04, 0]}>
        <meshStandardMaterial color={roofColor} roughness={0.7} />
      </Box>
      {/* Balconies */}
      {Array.from({ length: Math.floor(height / 0.8) }).map((_, j) => (
        <Box key={j} args={[width * 0.3, 0.04, 0.15]} position={[0, 0.6 + j * 0.8, depth / 2 + 0.07]}>
          <meshStandardMaterial color="#d4d4d8" roughness={0.5} />
        </Box>
      ))}
      {/* Windows */}
      {Array.from({ length: Math.floor(height / 0.8) }).map((_, j) => (
        <Box key={`w${j}`} args={[width * 0.2, 0.3, 0.02]} position={[0, 0.6 + j * 0.8, depth / 2 + 0.01]}>
          <meshStandardMaterial color="#7dd3fc" roughness={0.2} metalness={0.3} />
        </Box>
      ))}
    </group>
  )
}

// Orange tree (naranjo)
function OrangeTree({ position }) {
  return (
    <group position={position}>
      {/* Trunk */}
      <Cylinder args={[0.04, 0.06, 1.2, 6]} position={[0, 0.6, 0]}>
        <meshStandardMaterial color="#6B4226" roughness={0.9} />
      </Cylinder>
      {/* Canopy */}
      <Sphere args={[0.45, 8, 8]} position={[0, 1.5, 0]}>
        <meshStandardMaterial color="#166534" roughness={0.8} />
      </Sphere>
      {/* Oranges */}
      {[[0.2, 1.3, 0.2], [-0.15, 1.6, 0.25], [0.1, 1.7, -0.2], [-0.25, 1.35, -0.1]].map((p, i) => (
        <Sphere key={i} args={[0.05, 6, 6]} position={p}>
          <meshStandardMaterial color="#f97316" roughness={0.6} />
        </Sphere>
      ))}
    </group>
  )
}

// Marathon arch/banner
function MarathonArch({ position }) {
  return (
    <group position={position}>
      {/* Left post */}
      <Cylinder args={[0.05, 0.05, 3.5, 6]} position={[-1.8, 1.75, 0]}>
        <meshStandardMaterial color="#ffffff" roughness={0.4} />
      </Cylinder>
      {/* Right post */}
      <Cylinder args={[0.05, 0.05, 3.5, 6]} position={[1.8, 1.75, 0]}>
        <meshStandardMaterial color="#ffffff" roughness={0.4} />
      </Cylinder>
      {/* Banner */}
      <Box args={[3.6, 0.5, 0.05]} position={[0, 3.3, 0]}>
        <meshStandardMaterial color="#0ea5e9" roughness={0.5} />
      </Box>
      {/* Orange stripe */}
      <Box args={[3.6, 0.12, 0.06]} position={[0, 3.1, 0.01]}>
        <meshStandardMaterial color="#f97316" roughness={0.5} />
      </Box>
    </group>
  )
}

// Crowd barrier with spectator silhouettes
function CrowdSection({ position, side }) {
  const x = side * 2.2
  return (
    <group position={position}>
      {/* Metal barrier */}
      <Box args={[0.05, 0.7, 3]} position={[x, 0.35, 0]}>
        <meshStandardMaterial color="#9ca3af" roughness={0.3} metalness={0.5} />
      </Box>
      {/* Spectator silhouettes (simple cylinders + spheres) */}
      {[-0.8, 0, 0.8].map((zOff, i) => (
        <group key={i} position={[x + side * 0.4, 0, zOff]}>
          <Cylinder args={[0.08, 0.06, 1, 6]} position={[0, 0.5, 0]}>
            <meshStandardMaterial color={['#ef4444', '#3b82f6', '#eab308'][i]} roughness={0.7} />
          </Cylinder>
          <Sphere args={[0.08, 6, 6]} position={[0, 1.1, 0]}>
            <meshStandardMaterial color="#e8b094" roughness={0.8} />
          </Sphere>
        </group>
      ))}
    </group>
  )
}

const WALL_COLORS = ['#fef3c7', '#fde68a', '#fff7ed', '#fefce8', '#f5f5f4', '#fef9c3']
const ROOF_COLORS = ['#c2410c', '#b45309', '#a16207', '#9a3412']

function Track({ isPlaying }) {
  const mesh = useRef()

  useEffect(() => {
    if (isPlaying && mesh.current) {
      mesh.current.position.z = 0
    }
  }, [isPlaying])

  useFrame((state, delta) => {
    if (!isPlaying) return
    if (mesh.current) {
      mesh.current.position.z += 10 * delta
      if (mesh.current.position.z > 20) {
        mesh.current.position.z = 0
      }
    }
  })

  return (
    <group ref={mesh}>
      {/* Ground - terracotta sidewalk */}
      <Box args={[16, 0.1, 100]} position={[0, -0.05, -40]}>
        <meshStandardMaterial color="#d4a574" roughness={0.9} />
      </Box>
      {/* Asphalt road */}
      <Box args={[3.5, 0.11, 100]} position={[0, -0.04, -40]}>
        <meshStandardMaterial color="#374151" roughness={0.85} />
      </Box>
      {/* Blue marathon guideline */}
      <Box args={[0.15, 0.12, 100]} position={[0, -0.03, -40]}>
        <meshStandardMaterial color="#0ea5e9" roughness={0.3} />
      </Box>
      {/* Curb lines */}
      <Box args={[0.1, 0.14, 100]} position={[-1.75, -0.02, -40]}>
        <meshStandardMaterial color="#e5e7eb" roughness={0.5} />
      </Box>
      <Box args={[0.1, 0.14, 100]} position={[1.75, -0.02, -40]}>
        <meshStandardMaterial color="#e5e7eb" roughness={0.5} />
      </Box>

      {/* Mediterranean buildings - left side */}
      {Array.from({ length: 6 }).map((_, i) => {
        const h = 1.8 + (i * 37 % 7) * 0.3
        const w = 1.5 + (i * 13 % 5) * 0.2
        return (
          <Building
            key={`bl-${i}`}
            position={[-4.5 - (i % 2) * 0.5, 0, -i * 16 - 3]}
            width={w} height={h} depth={1.2}
            wallColor={WALL_COLORS[i % WALL_COLORS.length]}
            roofColor={ROOF_COLORS[i % ROOF_COLORS.length]}
          />
        )
      })}
      {/* Mediterranean buildings - right side */}
      {Array.from({ length: 6 }).map((_, i) => {
        const h = 2 + (i * 23 % 7) * 0.25
        const w = 1.4 + (i * 17 % 5) * 0.2
        return (
          <Building
            key={`br-${i}`}
            position={[4.5 + (i % 2) * 0.5, 0, -i * 16 - 10]}
            width={w} height={h} depth={1.2}
            wallColor={WALL_COLORS[(i + 3) % WALL_COLORS.length]}
            roofColor={ROOF_COLORS[(i + 1) % ROOF_COLORS.length]}
          />
        )
      })}

      {/* Orange trees (naranjos) along the boulevard */}
      {Array.from({ length: 10 }).map((_, i) => (
        <OrangeTree
          key={`ot-${i}`}
          position={[i % 2 === 0 ? -2.5 : 2.5, 0, -i * 10 - 4]}
        />
      ))}

      {/* Marathon arches */}
      <MarathonArch position={[0, 0, -25]} />
      <MarathonArch position={[0, 0, -75]} />

      {/* Crowd sections */}
      {Array.from({ length: 5 }).map((_, i) => (
        <React.Fragment key={`crowd-${i}`}>
          <CrowdSection position={[0, 0, -i * 20 - 8]} side={-1} />
          <CrowdSection position={[0, 0, -i * 20 - 15]} side={1} />
        </React.Fragment>
      ))}

      {/* Km marker signs */}
      {Array.from({ length: 4 }).map((_, i) => (
        <group key={`km-${i}`} position={[2.0, 0, -i * 25 - 12]}>
          <Cylinder args={[0.03, 0.03, 1.2, 6]} position={[0, 0.6, 0]}>
            <meshStandardMaterial color="#ffffff" roughness={0.5} />
          </Cylinder>
          <Box args={[0.4, 0.25, 0.04]} position={[0, 1.25, 0]}>
            <meshStandardMaterial color="#0ea5e9" roughness={0.4} />
          </Box>
        </group>
      ))}
    </group>
  )
}

function GameLogic({ setScore, setGameOver, isPlaying, setIsPlaying, jumpRef }) {
  const runnerY = useRef(0)
  const runnerVel = useRef(0)
  const isJumping = useRef(false)
  const obstacles = useRef([])
  const speed = useRef(INITIAL_SPEED)
  const spawnTimer = useRef(0)
  const scoreRef = useRef(0)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.code === 'Space' || e.code === 'ArrowUp') && isPlaying) {
        e.preventDefault()
        jumpRef.current = true
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPlaying, jumpRef])

  useEffect(() => {
    if (isPlaying) {
      runnerY.current = 0
      runnerVel.current = 0
      isJumping.current = false
      obstacles.current = []
      speed.current = INITIAL_SPEED
      spawnTimer.current = 0
      scoreRef.current = 0
      setScore(0)
      setGameOver(false)
    }
  }, [isPlaying, setScore, setGameOver])

  useFrame((state, delta) => {
    if (!isPlaying) return

    const scale = delta * 60

    if (jumpRef.current && !isJumping.current) {
      runnerVel.current = JUMP_FORCE
      isJumping.current = true
    }
    jumpRef.current = false

    runnerY.current += runnerVel.current * scale
    runnerVel.current -= GRAVITY * scale

    if (runnerY.current <= 0) {
      runnerY.current = 0
      runnerVel.current = 0
      isJumping.current = false
    }

    // Progressive difficulty: spawn faster and speed up more aggressively
    const distanceKm = (scoreRef.current * METERS_PER_POINT) / 1000
    const currentSpawnInterval = Math.max(
      0.35,
      OBSTACLE_SPAWN_INTERVAL - distanceKm * 0.06
    )
    spawnTimer.current += delta
    if (spawnTimer.current >= currentSpawnInterval) {
      spawnTimer.current = 0
      // Obstacle type depends on distance - harder types appear later
      let type = 0 // cone
      if (distanceKm > 5) {
        const r = Math.random()
        if (distanceKm > 20 && r < 0.25) type = 2 // water station (wide)
        else if (r < 0.35) type = 1 // barrier
      }
      obstacles.current.push({ id: Date.now(), z: -40, passed: false, type })
    }

    obstacles.current.forEach((obs) => {
      obs.z += speed.current * scale
    })

    obstacles.current = obstacles.current.filter((obs) => obs.z < 10)

    const runnerBox = new THREE.Box3(
      new THREE.Vector3(-0.15, runnerY.current, -0.15),
      new THREE.Vector3(0.15, runnerY.current + 1.5, 0.15)
    )

    for (let obs of obstacles.current) {
      // Wider hitbox for barriers and water stations
      const hw = obs.type === 0 ? 0.3 : 0.6
      const hh = obs.type === 2 ? 0.75 : 0.9
      const obsBox = new THREE.Box3(
        new THREE.Vector3(-hw, 0, obs.z - 0.3),
        new THREE.Vector3(hw, hh, obs.z + 0.3)
      )

      if (runnerBox.intersectsBox(obsBox)) {
        setIsPlaying(false)
        setGameOver(true)
        return
      }

      if (!obs.passed && obs.z > 0.5) {
        obs.passed = true
        scoreRef.current += 10
        setScore(scoreRef.current)
        // Speed ramps up: starts gentle, gets aggressive after km 10
        const km = (scoreRef.current * METERS_PER_POINT) / 1000
        speed.current += km < 10 ? 0.006 : km < 25 ? 0.01 : 0.015
      }
    }
  })

  return (
    <>
      <RunnerModel
        runnerYRef={runnerY}
        isJumpingRef={isJumping}
        isPlaying={isPlaying}
      />
      <ObstacleManager obstaclesRef={obstacles} />
      <Track isPlaying={isPlaying} />
    </>
  )
}

// Real Valencia Marathon route projected onto SVG viewbox
// Traced from actual course: Ciudad de las Artes → Turia → Centro Histórico →
// Torres de Serranos → Blasco Ibáñez → Malvarrosa → Puerto → Ruzafa → Jesús → finish
const ROUTE_POINTS = [
  [59,70],           // Start: Ciudad de las Artes (Monteolivete)
  [55,62],[50,55],   // North along Turia gardens
  [46,48],[42,43],   // Approaching historic center
  [38,40],[32,36],   // Historic center / Mercado Central
  [31,25],[35,22],   // Torres de Serranos, north
  [42,20],[50,19],   // Av Primado Reig / Naranjos heading NE
  [60,18],[70,19],   // Blasco Ibáñez toward university
  [80,22],[85,18],   // Approaching Malvarrosa coast
  [88,14],           // Malvarrosa beach (northernmost point)
  [88,22],[87,32],   // South along coast
  [86,42],           // Marina area
  [82,52],[78,58],   // Port / Nazaret
  [70,55],[60,50],   // Av del Puerto heading west
  [52,48],[46,54],   // Alameda, turning south
  [40,62],[36,68],   // Through Ruzafa
  [30,76],[28,80],   // Jesús / Patraix (SW loop)
  [32,82],[40,78],   // Turning back east
  [50,74],           // Approaching finish
  [59,70],           // Finish: Ciudad de las Artes (floating walkway)
]

// Km markers at roughly equal spacing along the route
const KM_MARKERS = [
  { km: 5, idx: 4 },   // near historic center
  { km: 10, idx: 8 },  // Naranjos / Primado Reig
  { km: 15, idx: 13 }, // Malvarrosa
  { km: 20, idx: 17 }, // port south
  { km: 25, idx: 20 }, // Av del Puerto
  { km: 30, idx: 23 }, // Ruzafa
  { km: 35, idx: 26 }, // Jesús/Patraix
  { km: 40, idx: 29 }, // approaching finish
]

function MarathonMap({ score }) {
  const totalPoints = ROUTE_POINTS.length - 1
  const progress = Math.min(1, (score * METERS_PER_POINT) / MARATHON_DISTANCE)
  const currentIndex = progress * totalPoints
  const segIndex = Math.min(Math.floor(currentIndex), totalPoints - 1)
  const segProgress = currentIndex - segIndex
  const px = ROUTE_POINTS[segIndex][0] + (ROUTE_POINTS[segIndex + 1][0] - ROUTE_POINTS[segIndex][0]) * segProgress
  const py = ROUTE_POINTS[segIndex][1] + (ROUTE_POINTS[segIndex + 1][1] - ROUTE_POINTS[segIndex][1]) * segProgress
  const pathD = ROUTE_POINTS.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ')
  const completedD = ROUTE_POINTS.slice(0, segIndex + 2).map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ')
  const km = ((score * METERS_PER_POINT) / 1000).toFixed(1)

  return (
    <div className="absolute p-2 rounded-lg top-3 left-3 bg-black/50 backdrop-blur-sm">
      <svg width="110" height="115" viewBox="15 5 80 85">
        {/* Sea on the east side */}
        <rect x="83" y="5" width="15" height="85" fill="#0c4a6e" opacity="0.3" />
        {/* Full route (remaining) */}
        <path d={pathD} fill="none" stroke="#ffffff30" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        {/* Completed route */}
        <path d={completedD} fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Km marker dots */}
        {KM_MARKERS.map(({ km: k, idx }) => (
          <g key={k}>
            <circle cx={ROUTE_POINTS[idx][0]} cy={ROUTE_POINTS[idx][1]} r="1.5" fill="#ffffff80" />
            <text x={ROUTE_POINTS[idx][0] + 3} y={ROUTE_POINTS[idx][1] + 1} fill="#ffffff90" fontSize="4" fontFamily="monospace">{k}</text>
          </g>
        ))}
        {/* Landmark labels */}
        <text x={30} y={30} fill="#ffffff60" fontSize="3.5" fontFamily="sans-serif">Centro</text>
        <text x={85} y={12} fill="#ffffff60" fontSize="3.5" fontFamily="sans-serif">Malvarrosa</text>
        <text x={75} y={60} fill="#ffffff60" fontSize="3.5" fontFamily="sans-serif">Puerto</text>
        <text x={44} y={46} fill="#ffffff60" fontSize="3.5" fontFamily="sans-serif">Turia</text>
        {/* Start/Finish marker */}
        <circle cx={ROUTE_POINTS[0][0]} cy={ROUTE_POINTS[0][1]} r="2.5" fill="#22c55e" stroke="#fff" strokeWidth="0.8" />
        <text x={ROUTE_POINTS[0][0] - 14} y={ROUTE_POINTS[0][1] + 1.5} fill="#22c55e" fontSize="3.5" fontWeight="bold" fontFamily="sans-serif">Inicio</text>
        {/* Runner dot */}
        <circle cx={px} cy={py} r="3" fill="#f97316" stroke="#fff" strokeWidth="1.2">
          <animate attributeName="r" values="2.5;4;2.5" dur="1s" repeatCount="indefinite" />
        </circle>
      </svg>
      <p className="mt-0.5 text-[10px] font-mono text-center text-white/80">
        km {km} / 42.2
      </p>
    </div>
  )
}

export function RunnerGame() {
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const jumpRef = useRef(false)

  return (
    <div className="relative w-full overflow-hidden border shadow-2xl h-96 rounded-xl border-zinc-200 dark:border-zinc-700">
      <Canvas
        shadows
        camera={{ position: [1.5, 2, 3.5], fov: 55 }}
        gl={{ antialias: true }}
      >
        <Sky sunPosition={[100, 40, 100]} turbidity={2} rayleigh={0.5} />
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[5, 10, 5]}
          intensity={1.5}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <hemisphereLight
          groundColor="#8b5e3c"
          color="#87ceeb"
          intensity={0.4}
        />
        <ContactShadows
          position={[0, -0.01, 0]}
          opacity={0.4}
          scale={20}
          blur={2}
          far={4}
        />

        <GameLogic
          setScore={setScore}
          setGameOver={setGameOver}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          jumpRef={jumpRef}
        />
      </Canvas>

      {/* Mini-map */}
      {isPlaying && <MarathonMap score={score} />}

      {/* Score */}
      <div className="absolute font-mono text-lg font-bold text-white top-4 right-4 drop-shadow-lg">
        <span className="text-2xl">{(score * METERS_PER_POINT).toLocaleString()} m</span>
      </div>

      {/* Start screen */}
      {!isPlaying && !gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="text-center text-white">
            <h2 className="mb-1 text-3xl font-bold drop-shadow-lg">
              Maratón Valencia
            </h2>
            <p className="mb-4 text-sm opacity-80">
              Esquiva los conos
            </p>
            <button
              onClick={() => setIsPlaying(true)}
              className="px-8 py-3 text-lg font-bold text-white transition transform bg-orange-500 rounded-full hover:scale-105 hover:bg-orange-400 active:scale-95"
            >
              Correr
            </button>
            <p className="mt-3 text-xs opacity-60">
              Espacio / Tap para saltar
            </p>
          </div>
        </div>
      )}

      {/* Game over */}
      {gameOver && <MarathonMap score={score} />}
      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-md">
          <div className="text-center text-white">
            <h2 className="mb-1 text-4xl font-bold">Fin de carrera</h2>
            <p className="mb-5 text-xl opacity-90">Distancia: {((score * METERS_PER_POINT) / 1000).toFixed(1)} km</p>
            <button
              onClick={() => setIsPlaying(true)}
              className="px-8 py-3 text-lg font-bold text-orange-600 transition transform bg-white rounded-full hover:scale-105 hover:bg-gray-100 active:scale-95"
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      )}

      {/* Mobile tap zone */}
      {isPlaying && (
        <div
          className="absolute inset-0 z-10"
          onPointerDown={() => {
            jumpRef.current = true
          }}
        />
      )}
    </div>
  )
}
