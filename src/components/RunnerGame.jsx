import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
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
const DOUBLE_JUMP_FORCE = 0.28
const INITIAL_SPEED = 0.2
const OBSTACLE_SPAWN_INTERVAL = 1.67
const OBSTACLE_POOL_SIZE = 15
const MARATHON_DISTANCE = 42195
const METERS_PER_POINT = 100
const LANE_WIDTH = 1.2
const LANE_SWITCH_SPEED = 0.12
const ORANGE_POOL_SIZE = 25
const ORANGE_SPAWN_INTERVAL = 0.35
const MIN_FOV = 55
const MAX_FOV = 72

// ─── Sound Manager ───────────────────────────────────────────────────────────

function createSoundManager() {
  let ctx = null

  function ensureCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  }

  function playTone(freq, endFreq, duration, type = 'sine', gain = 0.15) {
    try {
      const c = ensureCtx()
      const osc = c.createOscillator()
      const g = c.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(freq, c.currentTime)
      if (endFreq !== freq) osc.frequency.linearRampToValueAtTime(endFreq, c.currentTime + duration)
      g.gain.setValueAtTime(gain, c.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)
      osc.connect(g).connect(c.destination)
      osc.start(c.currentTime)
      osc.stop(c.currentTime + duration)
    } catch (e) { /* silent fail */ }
  }

  function playChord(freqs, duration, gain = 0.08) {
    freqs.forEach(f => playTone(f, f, duration, 'sine', gain))
  }

  return {
    jump() { playTone(250, 550, 0.1, 'sine', 0.12) },
    doubleJump() { playTone(400, 850, 0.12, 'sine', 0.12) },
    collect() { playTone(800, 1200, 0.08, 'sine', 0.1) },
    crash() { playTone(120, 60, 0.25, 'sawtooth', 0.15) },
    milestone() { playChord([523, 659, 784], 0.35, 0.07) },
    init() { ensureCtx() },
  }
}

// ─── Capsule Limb ────────────────────────────────────────────────────────────

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

// ─── Runner Model ────────────────────────────────────────────────────────────

function RunnerModel({ runnerYRef, runnerXRef, isJumpingRef, jumpCountRef, isPlaying, laneRef, prevLaneRef }) {
  const group = useRef()
  const leftUpperLeg = useRef()
  const rightUpperLeg = useRef()
  const leftLowerLeg = useRef()
  const rightLowerLeg = useRef()
  const leftUpperArm = useRef()
  const rightUpperArm = useRef()
  const leftLowerArm = useRef()
  const rightLowerArm = useRef()
  const torsoRef = useRef()

  const skinColor = '#e8b094'
  const shirtColor = '#f97316'
  const shortsColor = '#1e3a5f'
  const shoeColor = '#111827'
  const soleColor = '#f97316'
  const hairColor = '#3b2314'

  useFrame(({ clock }) => {
    if (!group.current) return
    group.current.position.y = runnerYRef.current
    group.current.position.x = runnerXRef.current

    // Lean into lane changes
    const leanTarget = (laneRef.current - (prevLaneRef?.current ?? laneRef.current)) * -0.15
    group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, leanTarget, 0.1)

    if (!isPlaying) return
    const t = clock.getElapsedTime() * 10

    if (torsoRef.current) {
      torsoRef.current.rotation.x = 0.12 + Math.sin(t * 2) * 0.02
      torsoRef.current.position.y = Math.abs(Math.sin(t)) * 0.03
    }

    if (isJumpingRef.current) {
      const isDouble = jumpCountRef.current >= 2
      if (isDouble) {
        // Arms extended outward for double jump
        if (leftUpperLeg.current) leftUpperLeg.current.rotation.x = -0.6
        if (rightUpperLeg.current) rightUpperLeg.current.rotation.x = -0.6
        if (leftLowerLeg.current) leftLowerLeg.current.rotation.x = -1.0
        if (rightLowerLeg.current) rightLowerLeg.current.rotation.x = -1.0
        if (leftUpperArm.current) { leftUpperArm.current.rotation.x = 0; leftUpperArm.current.rotation.z = -1.4 }
        if (rightUpperArm.current) { rightUpperArm.current.rotation.x = 0; rightUpperArm.current.rotation.z = 1.4 }
        if (leftLowerArm.current) leftLowerArm.current.rotation.x = 0
        if (rightLowerArm.current) rightLowerArm.current.rotation.x = 0
      } else {
        if (leftUpperLeg.current) leftUpperLeg.current.rotation.x = -0.8
        if (rightUpperLeg.current) rightUpperLeg.current.rotation.x = -0.4
        if (leftLowerLeg.current) leftLowerLeg.current.rotation.x = -0.9
        if (rightLowerLeg.current) rightLowerLeg.current.rotation.x = -0.6
        if (leftUpperArm.current) { leftUpperArm.current.rotation.x = -1.2; leftUpperArm.current.rotation.z = 0 }
        if (rightUpperArm.current) { rightUpperArm.current.rotation.x = -1.2; rightUpperArm.current.rotation.z = 0 }
        if (leftLowerArm.current) leftLowerArm.current.rotation.x = -0.8
        if (rightLowerArm.current) rightLowerArm.current.rotation.x = -0.8
      }
    } else {
      const stride = Math.sin(t)
      const strideOpp = Math.sin(t + Math.PI)

      if (leftUpperLeg.current) leftUpperLeg.current.rotation.x = stride * 1.0
      if (rightUpperLeg.current) rightUpperLeg.current.rotation.x = strideOpp * 1.0
      if (leftLowerLeg.current)
        leftLowerLeg.current.rotation.x = -Math.max(0, -stride) * 1.4 - 0.2
      if (rightLowerLeg.current)
        rightLowerLeg.current.rotation.x = -Math.max(0, -strideOpp) * 1.4 - 0.2

      if (leftUpperArm.current) { leftUpperArm.current.rotation.x = strideOpp * 0.8; leftUpperArm.current.rotation.z = 0 }
      if (rightUpperArm.current) { rightUpperArm.current.rotation.x = stride * 0.8; rightUpperArm.current.rotation.z = 0 }
      if (leftLowerArm.current)
        leftLowerArm.current.rotation.x = -Math.max(0, strideOpp) * 0.6 - 0.4
      if (rightLowerArm.current)
        rightLowerArm.current.rotation.x = -Math.max(0, stride) * 0.6 - 0.4
    }
  })

  return (
    <group ref={group} rotation={[0, Math.PI, 0]}>
      <group ref={torsoRef}>
        <Cylinder args={[0.18, 0.15, 0.45, 8]} position={[0, 0.95, 0]}>
          <meshStandardMaterial color={shirtColor} roughness={0.7} />
        </Cylinder>
        <Box args={[0.16, 0.12, 0.01]} position={[0, 0.88, 0.16]}>
          <meshStandardMaterial color="#ffffff" roughness={0.5} />
        </Box>
        <Cylinder args={[0.14, 0.16, 0.15, 8]} position={[0, 0.7, 0]}>
          <meshStandardMaterial color={shirtColor} roughness={0.7} />
        </Cylinder>

        <Cylinder args={[0.05, 0.06, 0.1, 8]} position={[0, 1.22, 0]}>
          <meshStandardMaterial color={skinColor} roughness={0.8} />
        </Cylinder>
        <group position={[0, 1.38, 0]}>
          <Sphere args={[0.11, 16, 16]} scale={[1, 1.15, 0.95]}>
            <meshStandardMaterial color={skinColor} roughness={0.8} />
          </Sphere>
          <Sphere args={[0.115, 16, 16]} scale={[1, 0.7, 0.98]} position={[0, 0.04, -0.01]}>
            <meshStandardMaterial color={hairColor} roughness={0.9} />
          </Sphere>
          <Sphere args={[0.015, 8, 8]} position={[-0.04, 0, 0.1]}>
            <meshStandardMaterial color="#1a1a1a" />
          </Sphere>
          <Sphere args={[0.015, 8, 8]} position={[0.04, 0, 0.1]}>
            <meshStandardMaterial color="#1a1a1a" />
          </Sphere>
        </group>

        <Sphere args={[0.06, 8, 8]} position={[-0.22, 1.12, 0]}>
          <meshStandardMaterial color={shirtColor} roughness={0.7} />
        </Sphere>
        <Sphere args={[0.06, 8, 8]} position={[0.22, 1.12, 0]}>
          <meshStandardMaterial color={shirtColor} roughness={0.7} />
        </Sphere>

        <group position={[-0.22, 1.12, 0]}>
          <group ref={leftUpperArm}>
            <Limb length={0.28} radius={0.04} color={skinColor} />
            <group position={[0, -0.28, 0]}>
              <group ref={leftLowerArm}>
                <Limb length={0.25} radius={0.035} color={skinColor} />
                <Sphere args={[0.04, 8, 8]} position={[0, -0.27, 0]}>
                  <meshStandardMaterial color={skinColor} roughness={0.8} />
                </Sphere>
              </group>
            </group>
          </group>
        </group>

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

      <Cylinder args={[0.16, 0.14, 0.08, 8]} position={[0, 0.6, 0]}>
        <meshStandardMaterial color={shortsColor} roughness={0.7} />
      </Cylinder>

      <group position={[-0.09, 0.58, 0]}>
        <group ref={leftUpperLeg}>
          <Limb length={0.35} radius={0.06} color={shortsColor} />
          <group position={[0, -0.35, 0]}>
            <group ref={leftLowerLeg}>
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

// ─── Obstacles ───────────────────────────────────────────────────────────────

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
      <Box args={[1.0, 0.8, 0.1]} position={[0, 0.4, 0]}>
        <meshStandardMaterial color="#dc2626" roughness={0.4} metalness={0.3} />
      </Box>
      <Box args={[1.0, 0.06, 0.1]} position={[0, 0.55, 0]}>
        <meshStandardMaterial color="#ffffff" roughness={0.4} />
      </Box>
      <Box args={[0.06, 0.8, 0.3]} position={[-0.45, 0.4, 0]}>
        <meshStandardMaterial color="#6b7280" roughness={0.3} metalness={0.5} />
      </Box>
      <Box args={[0.06, 0.8, 0.3]} position={[0.45, 0.4, 0]}>
        <meshStandardMaterial color="#6b7280" roughness={0.3} metalness={0.5} />
      </Box>
    </group>
  )
}

function ObstacleWaterStation() {
  return (
    <group>
      <Box args={[1.0, 0.05, 0.6]} position={[0, 0.7, 0]}>
        <meshStandardMaterial color="#ffffff" roughness={0.5} />
      </Box>
      <Cylinder args={[0.03, 0.03, 0.7, 6]} position={[-0.4, 0.35, -0.2]}>
        <meshStandardMaterial color="#9ca3af" roughness={0.3} />
      </Cylinder>
      <Cylinder args={[0.03, 0.03, 0.7, 6]} position={[0.4, 0.35, -0.2]}>
        <meshStandardMaterial color="#9ca3af" roughness={0.3} />
      </Cylinder>
      <Cylinder args={[0.03, 0.03, 0.7, 6]} position={[-0.4, 0.35, 0.2]}>
        <meshStandardMaterial color="#9ca3af" roughness={0.3} />
      </Cylinder>
      <Cylinder args={[0.03, 0.03, 0.7, 6]} position={[0.4, 0.35, 0.2]}>
        <meshStandardMaterial color="#9ca3af" roughness={0.3} />
      </Cylinder>
      {[-0.2, 0, 0.2].map((x, i) => (
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
        mesh.position.x = obstacles[i].lane * LANE_WIDTH
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

// ─── Collectible Oranges ─────────────────────────────────────────────────────

function OrangeManager({ orangesRef }) {
  const meshes = useRef([])

  useFrame(({ clock }) => {
    const oranges = orangesRef.current
    const t = clock.getElapsedTime()
    meshes.current.forEach((mesh, i) => {
      if (mesh && oranges[i] && !oranges[i].collected) {
        mesh.visible = true
        mesh.position.z = oranges[i].z
        mesh.position.x = oranges[i].lane * LANE_WIDTH
        mesh.position.y = 0.6 + Math.sin(t * 3 + i) * 0.08
        mesh.rotation.y = t * 2 + i
        mesh.scale.setScalar(1)
      } else if (mesh && oranges[i] && oranges[i].collected) {
        // Shrink animation
        const s = mesh.scale.x
        if (s > 0.05) {
          mesh.scale.setScalar(s * 0.85)
        } else {
          mesh.visible = false
        }
      } else if (mesh) {
        mesh.visible = false
      }
    })
  })

  return (
    <group>
      {Array.from({ length: ORANGE_POOL_SIZE }).map((_, i) => (
        <group
          key={i}
          ref={(el) => (meshes.current[i] = el)}
          visible={false}
        >
          <Sphere args={[0.15, 10, 10]}>
            <meshStandardMaterial color="#f97316" roughness={0.5} />
          </Sphere>
          {/* Stem */}
          <Cylinder args={[0.015, 0.015, 0.06, 4]} position={[0, 0.16, 0]}>
            <meshStandardMaterial color="#166534" roughness={0.8} />
          </Cylinder>
          {/* Leaf */}
          <Sphere args={[0.04, 6, 6]} scale={[1, 0.3, 1]} position={[0.03, 0.18, 0]}>
            <meshStandardMaterial color="#22c55e" roughness={0.7} />
          </Sphere>
        </group>
      ))}
    </group>
  )
}

// ─── Dust Particles ──────────────────────────────────────────────────────────

function DustParticles({ runnerXRef, runnerYRef, isPlaying, speedRef }) {
  const pointsRef = useRef()
  const particleCount = 30
  const positions = useMemo(() => new Float32Array(particleCount * 3), [])
  const opacities = useMemo(() => new Float32Array(particleCount), [])
  const velocities = useMemo(() => Array.from({ length: particleCount }, () => ({ x: 0, y: 0, z: 0, life: 0 })), [])
  const nextIdx = useRef(0)

  useFrame((_, delta) => {
    if (!pointsRef.current) return

    // Emit particles when running on ground
    if (isPlaying && runnerYRef.current < 0.05) {
      const count = Math.min(2, Math.ceil((speedRef.current / INITIAL_SPEED) * 0.5))
      for (let e = 0; e < count; e++) {
        const idx = nextIdx.current % particleCount
        nextIdx.current++
        positions[idx * 3] = runnerXRef.current + (Math.random() - 0.5) * 0.3
        positions[idx * 3 + 1] = 0.05
        positions[idx * 3 + 2] = (Math.random() - 0.5) * 0.2
        velocities[idx] = {
          x: (Math.random() - 0.5) * 0.3,
          y: 0.5 + Math.random() * 0.5,
          z: 0.5 + Math.random() * 0.5,
          life: 1.0,
        }
        opacities[idx] = 1.0
      }
    }

    // Update particles
    for (let i = 0; i < particleCount; i++) {
      const v = velocities[i]
      if (v.life > 0) {
        v.life -= delta * 2.5
        positions[i * 3] += v.x * delta
        positions[i * 3 + 1] += v.y * delta
        positions[i * 3 + 2] += v.z * delta
        opacities[i] = Math.max(0, v.life)
      } else {
        opacities[i] = 0
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color="#c9a87c"
        transparent
        opacity={0.5}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

// ─── Scenery ─────────────────────────────────────────────────────────────────

function Building({ position, width, height, depth, wallColor, roofColor }) {
  return (
    <group position={position}>
      <Box args={[width, height, depth]} position={[0, height / 2, 0]}>
        <meshStandardMaterial color={wallColor} roughness={0.85} />
      </Box>
      <Box args={[width + 0.1, 0.08, depth + 0.1]} position={[0, height + 0.04, 0]}>
        <meshStandardMaterial color={roofColor} roughness={0.7} />
      </Box>
      {Array.from({ length: Math.floor(height / 0.8) }).map((_, j) => (
        <Box key={j} args={[width * 0.3, 0.04, 0.15]} position={[0, 0.6 + j * 0.8, depth / 2 + 0.07]}>
          <meshStandardMaterial color="#d4d4d8" roughness={0.5} />
        </Box>
      ))}
      {Array.from({ length: Math.floor(height / 0.8) }).map((_, j) => (
        <Box key={`w${j}`} args={[width * 0.2, 0.3, 0.02]} position={[0, 0.6 + j * 0.8, depth / 2 + 0.01]}>
          <meshStandardMaterial color="#7dd3fc" roughness={0.2} metalness={0.3} />
        </Box>
      ))}
    </group>
  )
}

function OrangeTree({ position }) {
  return (
    <group position={position}>
      <Cylinder args={[0.04, 0.06, 1.2, 6]} position={[0, 0.6, 0]}>
        <meshStandardMaterial color="#6B4226" roughness={0.9} />
      </Cylinder>
      <Sphere args={[0.45, 8, 8]} position={[0, 1.5, 0]}>
        <meshStandardMaterial color="#166534" roughness={0.8} />
      </Sphere>
      {[[0.2, 1.3, 0.2], [-0.15, 1.6, 0.25], [0.1, 1.7, -0.2], [-0.25, 1.35, -0.1]].map((p, i) => (
        <Sphere key={i} args={[0.05, 6, 6]} position={p}>
          <meshStandardMaterial color="#f97316" roughness={0.6} />
        </Sphere>
      ))}
    </group>
  )
}

function MarathonArch({ position }) {
  return (
    <group position={position}>
      <Cylinder args={[0.05, 0.05, 3.5, 6]} position={[-1.8, 1.75, 0]}>
        <meshStandardMaterial color="#ffffff" roughness={0.4} />
      </Cylinder>
      <Cylinder args={[0.05, 0.05, 3.5, 6]} position={[1.8, 1.75, 0]}>
        <meshStandardMaterial color="#ffffff" roughness={0.4} />
      </Cylinder>
      <Box args={[3.6, 0.5, 0.05]} position={[0, 3.3, 0]}>
        <meshStandardMaterial color="#0ea5e9" roughness={0.5} />
      </Box>
      <Box args={[3.6, 0.12, 0.06]} position={[0, 3.1, 0.01]}>
        <meshStandardMaterial color="#f97316" roughness={0.5} />
      </Box>
    </group>
  )
}

function CrowdSection({ position, side }) {
  const x = side * 2.8
  return (
    <group position={position}>
      <Box args={[0.05, 0.7, 3]} position={[x, 0.35, 0]}>
        <meshStandardMaterial color="#9ca3af" roughness={0.3} metalness={0.5} />
      </Box>
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
      <Box args={[16, 0.1, 100]} position={[0, -0.05, -40]}>
        <meshStandardMaterial color="#d4a574" roughness={0.9} />
      </Box>
      {/* Wider road for 3 lanes */}
      <Box args={[4.5, 0.11, 100]} position={[0, -0.04, -40]}>
        <meshStandardMaterial color="#374151" roughness={0.85} />
      </Box>
      {/* Lane markers */}
      <Box args={[0.05, 0.115, 100]} position={[-LANE_WIDTH / 2, -0.03, -40]}>
        <meshStandardMaterial color="#ffffff" roughness={0.3} opacity={0.3} transparent />
      </Box>
      <Box args={[0.05, 0.115, 100]} position={[LANE_WIDTH / 2, -0.03, -40]}>
        <meshStandardMaterial color="#ffffff" roughness={0.3} opacity={0.3} transparent />
      </Box>
      {/* Blue marathon guideline */}
      <Box args={[0.15, 0.12, 100]} position={[0, -0.03, -40]}>
        <meshStandardMaterial color="#0ea5e9" roughness={0.3} />
      </Box>
      <Box args={[0.1, 0.14, 100]} position={[-2.25, -0.02, -40]}>
        <meshStandardMaterial color="#e5e7eb" roughness={0.5} />
      </Box>
      <Box args={[0.1, 0.14, 100]} position={[2.25, -0.02, -40]}>
        <meshStandardMaterial color="#e5e7eb" roughness={0.5} />
      </Box>

      {Array.from({ length: 6 }).map((_, i) => {
        const h = 1.8 + (i * 37 % 7) * 0.3
        const w = 1.5 + (i * 13 % 5) * 0.2
        return (
          <Building
            key={`bl-${i}`}
            position={[-5.0 - (i % 2) * 0.5, 0, -i * 16 - 3]}
            width={w} height={h} depth={1.2}
            wallColor={WALL_COLORS[i % WALL_COLORS.length]}
            roofColor={ROOF_COLORS[i % ROOF_COLORS.length]}
          />
        )
      })}
      {Array.from({ length: 6 }).map((_, i) => {
        const h = 2 + (i * 23 % 7) * 0.25
        const w = 1.4 + (i * 17 % 5) * 0.2
        return (
          <Building
            key={`br-${i}`}
            position={[5.0 + (i % 2) * 0.5, 0, -i * 16 - 10]}
            width={w} height={h} depth={1.2}
            wallColor={WALL_COLORS[(i + 3) % WALL_COLORS.length]}
            roofColor={ROOF_COLORS[(i + 1) % ROOF_COLORS.length]}
          />
        )
      })}

      {Array.from({ length: 10 }).map((_, i) => (
        <OrangeTree
          key={`ot-${i}`}
          position={[i % 2 === 0 ? -3.0 : 3.0, 0, -i * 10 - 4]}
        />
      ))}

      <MarathonArch position={[0, 0, -25]} />
      <MarathonArch position={[0, 0, -75]} />

      {Array.from({ length: 5 }).map((_, i) => (
        <React.Fragment key={`crowd-${i}`}>
          <CrowdSection position={[0, 0, -i * 20 - 8]} side={-1} />
          <CrowdSection position={[0, 0, -i * 20 - 15]} side={1} />
        </React.Fragment>
      ))}

      {Array.from({ length: 4 }).map((_, i) => (
        <group key={`km-${i}`} position={[2.5, 0, -i * 25 - 12]}>
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

// ─── FOV Controller ──────────────────────────────────────────────────────────

function FOVController({ speedRef, isPlaying, crashRef }) {
  const { camera } = useThree()
  const shakeRef = useRef(0)

  useFrame((_, delta) => {
    // FOV based on speed
    if (isPlaying) {
      const speedRatio = Math.min(1, (speedRef.current - INITIAL_SPEED) / 0.6)
      const targetFov = MIN_FOV + (MAX_FOV - MIN_FOV) * speedRatio
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.05)
    } else {
      camera.fov = THREE.MathUtils.lerp(camera.fov, MIN_FOV, 0.05)
    }

    // Camera shake on crash
    if (crashRef.current > 0) {
      crashRef.current -= delta * 4
      const intensity = crashRef.current * 0.1
      camera.position.x = 1.5 + (Math.random() - 0.5) * intensity
      camera.position.y = 2 + (Math.random() - 0.5) * intensity
    } else {
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, 1.5, 0.1)
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, 2, 0.1)
    }

    camera.updateProjectionMatrix()
  })

  return null
}

// ─── Game Logic ──────────────────────────────────────────────────────────────

function GameLogic({
  setScore, setGameOver, isPlaying, setIsPlaying,
  jumpRef, laneInputRef, soundManager,
  setOrangeCount, speedRef, crashRef,
  setLastMilestone,
}) {
  const runnerY = useRef(0)
  const runnerX = useRef(0)
  const runnerVel = useRef(0)
  const isJumping = useRef(false)
  const jumpCount = useRef(0)
  const lane = useRef(0)
  const prevLane = useRef(0)
  const obstacles = useRef([])
  const oranges = useRef([])
  const spawnTimer = useRef(0)
  const orangeSpawnTimer = useRef(0)
  const scoreRef = useRef(0)
  const orangeCountRef = useRef(0)
  const lastMilestoneKm = useRef(0)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isPlaying) return
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault()
        jumpRef.current = true
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault()
        laneInputRef.current = -1
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault()
        laneInputRef.current = 1
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPlaying, jumpRef, laneInputRef])

  useEffect(() => {
    if (isPlaying) {
      runnerY.current = 0
      runnerX.current = 0
      runnerVel.current = 0
      isJumping.current = false
      jumpCount.current = 0
      lane.current = 0
      prevLane.current = 0
      obstacles.current = []
      oranges.current = []
      speedRef.current = INITIAL_SPEED
      spawnTimer.current = 0
      orangeSpawnTimer.current = 0
      scoreRef.current = 0
      orangeCountRef.current = 0
      lastMilestoneKm.current = 0
      setScore(0)
      setOrangeCount(0)
      setGameOver(false)
      crashRef.current = 0
    }
  }, [isPlaying, setScore, setGameOver, setOrangeCount, speedRef, crashRef])

  useFrame((state, delta) => {
    if (!isPlaying) return
    const scale = delta * 60

    // ── Lane switching ──
    if (laneInputRef.current !== 0) {
      prevLane.current = lane.current
      lane.current = Math.max(-1, Math.min(1, lane.current + laneInputRef.current))
      laneInputRef.current = 0
    }
    const targetX = lane.current * LANE_WIDTH
    runnerX.current = THREE.MathUtils.lerp(runnerX.current, targetX, LANE_SWITCH_SPEED * scale)

    // ── Jumping ──
    if (jumpRef.current && jumpCount.current < 2) {
      if (jumpCount.current === 0) {
        runnerVel.current = JUMP_FORCE
        soundManager.jump()
      } else {
        runnerVel.current = DOUBLE_JUMP_FORCE
        soundManager.doubleJump()
      }
      jumpCount.current += 1
      isJumping.current = true
    }
    jumpRef.current = false

    runnerY.current += runnerVel.current * scale
    runnerVel.current -= GRAVITY * scale

    if (runnerY.current <= 0) {
      runnerY.current = 0
      runnerVel.current = 0
      isJumping.current = false
      jumpCount.current = 0
    }

    // ── Obstacle spawning ──
    const distanceKm = (scoreRef.current * METERS_PER_POINT) / 1000
    const currentSpawnInterval = Math.max(0.35, OBSTACLE_SPAWN_INTERVAL - distanceKm * 0.06)

    spawnTimer.current += delta
    if (spawnTimer.current >= currentSpawnInterval) {
      spawnTimer.current = 0
      let type = 0
      if (distanceKm > 5) {
        const r = Math.random()
        if (distanceKm > 20 && r < 0.25) type = 2
        else if (r < 0.35) type = 1
      }

      // Pick lane(s) for obstacle
      const obsLane = Math.floor(Math.random() * 3) - 1
      obstacles.current.push({ id: Date.now(), z: -40, passed: false, type, lane: obsLane })

      // Occasionally spawn in adjacent lane too (harder)
      if (distanceKm > 8 && Math.random() < 0.35) {
        const adjLane = obsLane === 0
          ? (Math.random() < 0.5 ? -1 : 1)
          : obsLane === -1 ? 0 : 0
        obstacles.current.push({ id: Date.now() + 1, z: -40, passed: false, type: 0, lane: adjLane })
      }
    }

    // ── Orange spawning ──
    orangeSpawnTimer.current += delta
    if (orangeSpawnTimer.current >= ORANGE_SPAWN_INTERVAL) {
      orangeSpawnTimer.current = 0
      const orangeLane = Math.floor(Math.random() * 3) - 1

      // Sometimes spawn a line of oranges
      const lineCount = Math.random() < 0.2 ? (3 + Math.floor(Math.random() * 3)) : 1
      for (let li = 0; li < lineCount; li++) {
        if (oranges.current.length < ORANGE_POOL_SIZE) {
          oranges.current.push({
            id: Date.now() + li,
            z: -40 - li * 1.5,
            lane: orangeLane,
            collected: false,
          })
        }
      }
    }

    // ── Move obstacles & oranges ──
    obstacles.current.forEach((obs) => { obs.z += speedRef.current * scale })
    oranges.current.forEach((o) => { if (!o.collected) o.z += speedRef.current * scale })

    obstacles.current = obstacles.current.filter((obs) => obs.z < 10)
    oranges.current = oranges.current.filter((o) => o.z < 10)

    // ── Collision: obstacles ──
    const rx = runnerX.current
    const ry = runnerY.current
    const runnerBox = new THREE.Box3(
      new THREE.Vector3(rx - 0.15, ry, -0.15),
      new THREE.Vector3(rx + 0.15, ry + 1.5, 0.15)
    )

    for (let obs of obstacles.current) {
      const hw = obs.type === 0 ? 0.3 : 0.5
      const hh = obs.type === 2 ? 0.75 : 0.9
      const ox = obs.lane * LANE_WIDTH
      const obsBox = new THREE.Box3(
        new THREE.Vector3(ox - hw, 0, obs.z - 0.3),
        new THREE.Vector3(ox + hw, hh, obs.z + 0.3)
      )

      if (runnerBox.intersectsBox(obsBox)) {
        soundManager.crash()
        crashRef.current = 1.0
        setIsPlaying(false)
        setGameOver(true)
        return
      }

      if (!obs.passed && obs.z > 0.5) {
        obs.passed = true
        scoreRef.current += 10
        setScore(scoreRef.current)
        const km = (scoreRef.current * METERS_PER_POINT) / 1000
        speedRef.current += km < 10 ? 0.006 : km < 25 ? 0.01 : 0.015
      }
    }

    // ── Collision: oranges ──
    for (let o of oranges.current) {
      if (o.collected) continue
      const ox = o.lane * LANE_WIDTH
      const dist = Math.sqrt(
        (rx - ox) ** 2 + (ry + 0.7 - 0.6) ** 2 + (0 - o.z) ** 2
      )
      if (dist < 0.55) {
        o.collected = true
        orangeCountRef.current += 1
        setOrangeCount(orangeCountRef.current)
        scoreRef.current += 5
        setScore(scoreRef.current)
        soundManager.collect()
      }
    }

    // ── Milestone sounds ──
    const currentKm = Math.floor(distanceKm / 5)
    if (currentKm > lastMilestoneKm.current && distanceKm >= 5) {
      lastMilestoneKm.current = currentKm
      soundManager.milestone()
      setLastMilestone(currentKm * 5)
    }
  })

  return (
    <>
      <RunnerModel
        runnerYRef={runnerY}
        runnerXRef={runnerX}
        isJumpingRef={isJumping}
        jumpCountRef={jumpCount}
        isPlaying={isPlaying}
        laneRef={lane}
        prevLaneRef={prevLane}
      />
      <ObstacleManager obstaclesRef={obstacles} />
      <OrangeManager orangesRef={oranges} />
      <DustParticles
        runnerXRef={runnerX}
        runnerYRef={runnerY}
        isPlaying={isPlaying}
        speedRef={speedRef}
      />
      <Track isPlaying={isPlaying} />
    </>
  )
}

// ─── Marathon Map ────────────────────────────────────────────────────────────

const ROUTE_POINTS = [
  [59,70],[55,62],[50,55],[46,48],[42,43],
  [38,40],[32,36],[31,25],[35,22],[42,20],
  [50,19],[60,18],[70,19],[80,22],[85,18],
  [88,14],[88,22],[87,32],[86,42],[82,52],
  [78,58],[70,55],[60,50],[52,48],[46,54],
  [40,62],[36,68],[30,76],[28,80],[32,82],
  [40,78],[50,74],[59,70],
]

const KM_MARKERS = [
  { km: 5, idx: 4 },
  { km: 10, idx: 8 },
  { km: 15, idx: 13 },
  { km: 20, idx: 17 },
  { km: 25, idx: 20 },
  { km: 30, idx: 23 },
  { km: 35, idx: 26 },
  { km: 40, idx: 29 },
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
        <rect x="83" y="5" width="15" height="85" fill="#0c4a6e" opacity="0.3" />
        <path d={pathD} fill="none" stroke="#ffffff30" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d={completedD} fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {KM_MARKERS.map(({ km: k, idx }) => (
          <g key={k}>
            <circle cx={ROUTE_POINTS[idx][0]} cy={ROUTE_POINTS[idx][1]} r="1.5" fill="#ffffff80" />
            <text x={ROUTE_POINTS[idx][0] + 3} y={ROUTE_POINTS[idx][1] + 1} fill="#ffffff90" fontSize="4" fontFamily="monospace">{k}</text>
          </g>
        ))}
        <text x={30} y={30} fill="#ffffff60" fontSize="3.5" fontFamily="sans-serif">Centro</text>
        <text x={85} y={12} fill="#ffffff60" fontSize="3.5" fontFamily="sans-serif">Malvarrosa</text>
        <text x={75} y={60} fill="#ffffff60" fontSize="3.5" fontFamily="sans-serif">Puerto</text>
        <text x={44} y={46} fill="#ffffff60" fontSize="3.5" fontFamily="sans-serif">Turia</text>
        <circle cx={ROUTE_POINTS[0][0]} cy={ROUTE_POINTS[0][1]} r="2.5" fill="#22c55e" stroke="#fff" strokeWidth="0.8" />
        <text x={ROUTE_POINTS[0][0] - 14} y={ROUTE_POINTS[0][1] + 1.5} fill="#22c55e" fontSize="3.5" fontWeight="bold" fontFamily="sans-serif">Inicio</text>
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

// ─── Main Component ──────────────────────────────────────────────────────────

export function RunnerGame() {
  const [score, setScore] = useState(0)
  const [orangeCount, setOrangeCount] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [highScore, setHighScore] = useState(0)
  const [isNewRecord, setIsNewRecord] = useState(false)
  const [lastMilestone, setLastMilestone] = useState(0)
  const jumpRef = useRef(false)
  const laneInputRef = useRef(0)
  const speedRef = useRef(INITIAL_SPEED)
  const crashRef = useRef(0)
  const touchStartRef = useRef({ x: 0, y: 0 })

  const soundManager = useMemo(() => createSoundManager(), [])

  // Load high score
  useEffect(() => {
    try {
      const saved = localStorage.getItem('marathon-highscore')
      if (saved) setHighScore(parseFloat(saved))
    } catch (e) { /* silent */ }
  }, [])

  // Check high score on game over
  useEffect(() => {
    if (gameOver) {
      const distance = score * METERS_PER_POINT
      if (distance > highScore) {
        setHighScore(distance)
        setIsNewRecord(true)
        try { localStorage.setItem('marathon-highscore', String(distance)) } catch (e) { /* */ }
      } else {
        setIsNewRecord(false)
      }
    }
  }, [gameOver, score, highScore])

  const handleStart = useCallback(() => {
    soundManager.init()
    setIsPlaying(true)
    setLastMilestone(0)
  }, [soundManager])

  const handlePointerDown = useCallback((e) => {
    touchStartRef.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handlePointerUp = useCallback((e) => {
    const dx = e.clientX - touchStartRef.current.x
    const dy = e.clientY - touchStartRef.current.y
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)

    if (absDx > 30 && absDx > absDy) {
      // Horizontal swipe → lane switch
      laneInputRef.current = dx > 0 ? 1 : -1
    } else if (absDy > 30 && dy < 0) {
      // Swipe up → jump
      jumpRef.current = true
    } else {
      // Tap → jump
      jumpRef.current = true
    }
  }, [])

  const distanceM = score * METERS_PER_POINT
  const distanceKm = (distanceM / 1000).toFixed(1)
  const paceMinKm = speedRef.current > 0
    ? (60 / (speedRef.current * 300)).toFixed(0) // approximate pace
    : '--'

  return (
    <div className="relative w-full overflow-hidden border shadow-2xl h-96 rounded-xl border-zinc-200 dark:border-zinc-700">
      <Canvas
        shadows
        camera={{ position: [1.5, 2, 3.5], fov: MIN_FOV }}
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

        <FOVController speedRef={speedRef} isPlaying={isPlaying} crashRef={crashRef} />

        <GameLogic
          setScore={setScore}
          setGameOver={setGameOver}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          jumpRef={jumpRef}
          laneInputRef={laneInputRef}
          soundManager={soundManager}
          setOrangeCount={setOrangeCount}
          speedRef={speedRef}
          crashRef={crashRef}
          setLastMilestone={setLastMilestone}
        />
      </Canvas>

      {/* Mini-map */}
      {isPlaying && <MarathonMap score={score} />}

      {/* HUD */}
      {isPlaying && (
        <div className="absolute font-mono text-white top-3 right-3 drop-shadow-lg text-right">
          <div className="text-2xl font-bold">{distanceM.toLocaleString()} m</div>
          <div className="text-xs opacity-70">{paceMinKm} min/km</div>
          {highScore > 0 && (
            <div className="text-xs opacity-50">Mejor: {(highScore / 1000).toFixed(1)} km</div>
          )}
          <div className="flex items-center justify-end gap-1 mt-1 text-sm">
            <span className="inline-block w-3 h-3 rounded-full bg-orange-400" />
            <span>{orangeCount}</span>
          </div>
        </div>
      )}

      {/* Milestone toast */}
      {isPlaying && lastMilestone > 0 && (
        <div
          key={lastMilestone}
          className="absolute text-lg font-bold text-orange-400 -translate-x-1/2 top-16 left-1/2 drop-shadow-lg animate-bounce"
        >
          KM {lastMilestone}!
        </div>
      )}

      {/* Start screen */}
      {!isPlaying && !gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="text-center text-white">
            <h2 className="mb-1 text-3xl font-bold drop-shadow-lg">
              Maratón Valencia
            </h2>
            <p className="mb-4 text-sm opacity-80">
              Esquiva obstáculos y recoge naranjas
            </p>
            <button
              onClick={handleStart}
              className="px-8 py-3 text-lg font-bold text-white transition transform bg-orange-500 rounded-full hover:scale-105 hover:bg-orange-400 active:scale-95"
            >
              Correr
            </button>
            <div className="mt-4 space-y-1 text-xs opacity-60">
              <p>Espacio / Tap → Saltar (x2)</p>
              <p>← → / Swipe → Cambiar carril</p>
            </div>
            {highScore > 0 && (
              <p className="mt-3 text-sm text-orange-300">
                Mejor: {(highScore / 1000).toFixed(1)} km
              </p>
            )}
          </div>
        </div>
      )}

      {/* Game over */}
      {gameOver && <MarathonMap score={score} />}
      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-md">
          <div className="text-center text-white">
            {isNewRecord && (
              <p className="mb-2 text-lg font-bold text-orange-400 animate-pulse">
                Nuevo record!
              </p>
            )}
            <h2 className="mb-1 text-4xl font-bold">Fin de carrera</h2>
            <p className="mb-1 text-xl opacity-90">Distancia: {distanceKm} km</p>
            <div className="flex items-center justify-center gap-1 mb-4 text-lg opacity-80">
              <span className="inline-block w-4 h-4 rounded-full bg-orange-400" />
              <span>{orangeCount} naranjas</span>
            </div>
            <button
              onClick={handleStart}
              className="px-8 py-3 text-lg font-bold text-orange-600 transition transform bg-white rounded-full hover:scale-105 hover:bg-gray-100 active:scale-95"
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      )}

      {/* Mobile touch zone */}
      {isPlaying && (
        <div
          className="absolute inset-0 z-10"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        />
      )}
    </div>
  )
}
