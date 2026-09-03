import type {
  AuroraAreaVfxObjectTransform,
  AuroraAreaVfxSceneCollisionInput,
  AuroraAreaVfxVector3
} from "../../../common/aurora/vfx/aurora-area-vfx-collision.types";
import { createAuroraRetailAreaWokCollisionContext } from "./aurora-wok-walkmesh";
import type {
  AuroraParticleCollisionContext,
  AuroraParticleCollisionQuery,
  AuroraRuntimeVector3
} from "./aurora-vfx-runtime-state";

const VECTOR_EPSILON = 1e-8;

export function createAuroraAreaVfxSceneCollisionContext(
  input: AuroraAreaVfxSceneCollisionInput
): AuroraParticleCollisionContext {
  const resourcesById = new Map(
    input.area.resources.map((resource) => [resource.resourceId, resource] as const)
  );
  const areaContext = createAuroraRetailAreaWokCollisionContext({
    collisionProfileId: `aurora-runtime-static-wok-hit/v1:${input.area.fingerprint}`,
    instances: input.area.instances.flatMap((instance) => {
      const resource = resourcesById.get(instance.resourceId);
      if (!resource) {
        return [];
      }
      return [
        {
          instanceId: instance.instanceId,
          walkmesh: resource.walkmesh,
          translation: instance.translation,
          orientationQuarterTurns: instance.orientationQuarterTurns
        }
      ];
    })
  });

  return {
    ...areaContext,
    resolve(query) {
      const areaQuery = transformCollisionQueryToArea(query, input.objectTransform);
      const result = areaContext.resolve(areaQuery);
      if (
        !result ||
        result.status !== "hit" ||
        !result.hitPosition ||
        !result.contactNormal ||
        typeof result.segmentParameter !== "number"
      ) {
        return result;
      }
      return {
        ...result,
        hitPosition: transformPointFromArea(result.hitPosition, input.objectTransform),
        contactNormal: transformNormalFromArea(result.contactNormal, input.objectTransform),
        contactDistance:
          vectorLength(subtract(query.testEndpoint, query.currentPosition)) *
          result.segmentParameter
      };
    }
  };
}

function transformCollisionQueryToArea(
  query: AuroraParticleCollisionQuery,
  transform: AuroraAreaVfxObjectTransform
): AuroraParticleCollisionQuery {
  return {
    ...query,
    currentPosition: transformPointToArea(query.currentPosition, transform),
    predictedPosition: transformPointToArea(query.predictedPosition, transform),
    testEndpoint: transformPointToArea(query.testEndpoint, transform),
    velocityBeforeCollision: transformDirectionToArea(
      query.velocityBeforeCollision,
      transform
    )
  };
}

function transformPointToArea(
  point: AuroraAreaVfxVector3,
  transform: AuroraAreaVfxObjectTransform
): AuroraRuntimeVector3 {
  const visual = transform.visualTransform;
  const transformed = applyVisualRotation(
    {
      x: point.x * visual.scaleX,
      y: point.y * visual.scaleY,
      z: point.z * visual.scaleZ
    },
    transform
  );
  const withVisualOffset = add(transformed, {
    x: visual.offsetX,
    y: visual.offsetY,
    z: visual.offsetZ
  });
  return add(rotateZ(withVisualOffset, transform.bearingRadians), transform.translation);
}

function transformPointFromArea(
  point: AuroraAreaVfxVector3,
  transform: AuroraAreaVfxObjectTransform
): AuroraRuntimeVector3 {
  const visual = transform.visualTransform;
  const placementLocal = rotateZ(
    subtract(point, transform.translation),
    -transform.bearingRadians
  );
  const visualLocal = subtract(placementLocal, {
    x: visual.offsetX,
    y: visual.offsetY,
    z: visual.offsetZ
  });
  const rotated = applyInverseVisualRotation(visualLocal, transform);
  return {
    x: rotated.x / visual.scaleX,
    y: rotated.y / visual.scaleY,
    z: rotated.z / visual.scaleZ
  };
}

function transformDirectionToArea(
  direction: AuroraAreaVfxVector3,
  transform: AuroraAreaVfxObjectTransform
): AuroraRuntimeVector3 {
  const visual = transform.visualTransform;
  const scaled = {
    x: direction.x * visual.scaleX,
    y: direction.y * visual.scaleY,
    z: direction.z * visual.scaleZ
  };
  return rotateZ(applyVisualRotation(scaled, transform), transform.bearingRadians);
}

function transformNormalFromArea(
  normal: AuroraAreaVfxVector3,
  transform: AuroraAreaVfxObjectTransform
): AuroraRuntimeVector3 {
  const visual = transform.visualTransform;
  const placementLocal = rotateZ(normal, -transform.bearingRadians);
  const visualLocal = applyInverseVisualRotation(placementLocal, transform);
  return normalize({
    x: visualLocal.x * visual.scaleX,
    y: visualLocal.y * visual.scaleY,
    z: visualLocal.z * visual.scaleZ
  });
}

function applyVisualRotation(
  vector: AuroraAreaVfxVector3,
  transform: AuroraAreaVfxObjectTransform
): AuroraRuntimeVector3 {
  const visual = transform.visualTransform;
  return rotateZ(
    rotateX(rotateY(vector, visual.yaw), visual.roll),
    visual.pitch
  );
}

function applyInverseVisualRotation(
  vector: AuroraAreaVfxVector3,
  transform: AuroraAreaVfxObjectTransform
): AuroraRuntimeVector3 {
  const visual = transform.visualTransform;
  return rotateY(
    rotateX(rotateZ(vector, -visual.pitch), -visual.roll),
    -visual.yaw
  );
}

function rotateX(vector: AuroraAreaVfxVector3, angle: number): AuroraRuntimeVector3 {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: vector.x,
    y: vector.y * cosine - vector.z * sine,
    z: vector.y * sine + vector.z * cosine
  };
}

function rotateY(vector: AuroraAreaVfxVector3, angle: number): AuroraRuntimeVector3 {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: vector.x * cosine + vector.z * sine,
    y: vector.y,
    z: -vector.x * sine + vector.z * cosine
  };
}

function rotateZ(vector: AuroraAreaVfxVector3, angle: number): AuroraRuntimeVector3 {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: vector.x * cosine - vector.y * sine,
    y: vector.x * sine + vector.y * cosine,
    z: vector.z
  };
}

function add(
  left: AuroraAreaVfxVector3,
  right: AuroraAreaVfxVector3
): AuroraRuntimeVector3 {
  return {
    x: left.x + right.x,
    y: left.y + right.y,
    z: left.z + right.z
  };
}

function subtract(
  left: AuroraAreaVfxVector3,
  right: AuroraAreaVfxVector3
): AuroraRuntimeVector3 {
  return {
    x: left.x - right.x,
    y: left.y - right.y,
    z: left.z - right.z
  };
}

function normalize(vector: AuroraAreaVfxVector3): AuroraRuntimeVector3 {
  const length = vectorLength(vector);
  if (length <= VECTOR_EPSILON) {
    return { x: 0, y: 0, z: 1 };
  }
  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length
  };
}

function vectorLength(vector: AuroraAreaVfxVector3): number {
  return Math.hypot(vector.x, vector.y, vector.z);
}
